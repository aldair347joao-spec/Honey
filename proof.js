/*
============================================================
HONEY PAY
PAYMENT PROOF SERVICE
V1.0.0
============================================================

GESTÃO REAL DE COMPROVATIVOS DE PAGAMENTO

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Receber comprovativos enviados pelo cliente
- Validar ficheiros
- Limitar tamanho
- Validar MIME type
- Validar extensão
- Guardar ficheiros no MongoDB GridFS
- Associar comprovativo à fatura
- Impedir múltiplos comprovativos ativos
- Criar fingerprint SHA-256
- Detectar reutilização do mesmo ficheiro
- Registar IP e User-Agent
- Atualizar estado da fatura
- Permitir revisão futura
- Permitir rejeição
- Permitir consulta segura pelo comerciante
- Preparar o Escudo Antifraude

------------------------------------------------------------
ARMAZENAMENTO
------------------------------------------------------------

MongoDB Atlas
GridFS

Não utiliza filesystem local do Render.

------------------------------------------------------------
FORMATOS ACEITES
------------------------------------------------------------

JPEG
PNG
WEBP
PDF

------------------------------------------------------------
LIMITE
------------------------------------------------------------

10 MB por comprovativo

============================================================
*/

import crypto from "node:crypto";
import {
    ObjectId,
    GridFSBucket
} from "mongodb";


import {
    getDatabase
} from "./database.js";


import {
    markProofSubmitted,
    markInvoiceUnderReview,
    getPublicInvoice
} from "./invoice.js";


/*
============================================================
CONFIGURAÇÃO
============================================================
*/

const PROOF_COLLECTION =
    "paymentProofs";


const BUCKET_NAME =
    "paymentProofFiles";


const MAX_FILE_SIZE =
    10 *
    1024 *
    1024;


const MIN_FILE_SIZE =
    100;


const MAX_PROOFS_PER_INVOICE =
    5;


const ALLOWED_MIME_TYPES =
    Object.freeze({

        "image/jpeg":
            "jpg",

        "image/png":
            "png",

        "image/webp":
            "webp",

        "application/pdf":
            "pdf"
    });


const ALLOWED_EXTENSIONS =
    new Set([

        "jpg",
        "jpeg",
        "png",
        "webp",
        "pdf"

    ]);


/*
============================================================
ERROR
============================================================
*/

function createError(
    message,
    code,
    statusCode = 400,
    details = null
) {

    const error =
        new Error(
            message
        );


    error.code =
        code;


    error.statusCode =
        statusCode;


    if (
        details !==
        null
    ) {

        error.details =
            details;
    }


    return error;
}


/*
============================================================
ID NORMALIZATION
============================================================
*/

function normalizeObjectId(
    value,
    code = "INVALID_ID",
    message = "Identificador inválido."
) {

    if (
        value instanceof ObjectId
    ) {

        return value;
    }


    if (
        typeof value !==
        "string"
    ) {

        throw createError(
            message,
            code
        );
    }


    const normalized =
        value.trim();


    if (
        !ObjectId.isValid(
            normalized
        )
    ) {

        throw createError(
            message,
            code
        );
    }


    return new ObjectId(
        normalized
    );
}


/*
============================================================
TEXT NORMALIZATION
============================================================
*/

function cleanString(
    value,
    maxLength = 500
) {

    if (
        value ===
        null ||
        value ===
        undefined
    ) {

        return "";
    }


    return String(
        value
    )
        .normalize(
            "NFKC"
        )
        .replace(
            /[\u0000-\u001F\u007F]/g,
            ""
        )
        .trim()
        .slice(
            0,
            maxLength
        );
}


/*
============================================================
EXTENSION
============================================================
*/

function getExtension(
    filename
) {

    const cleanName =
        cleanString(
            filename,
            255
        )
            .toLowerCase();


    const lastDot =
        cleanName.lastIndexOf(
            "."
        );


    if (
        lastDot ===
        -1
    ) {

        return "";
    }


    return cleanName
        .slice(
            lastDot + 1
        )
        .replace(
            /[^a-z0-9]/g,
            ""
        );
}


/*
============================================================
MIME NORMALIZATION
============================================================
*/

function normalizeMime(
    mimeType
) {

    return cleanString(
        mimeType,
        100
    )
        .toLowerCase();
}


/*
============================================================
SHA-256
============================================================
*/

function calculateHash(
    buffer
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            buffer
        )
        .digest(
            "hex"
        );
}


/*
============================================================
RANDOM STORAGE NAME
============================================================
*/

function generateStorageName(
    extension
) {

    const random =
        crypto
            .randomBytes(
                24
            )
            .toString(
                "hex"
            );


    return `${random}.${extension}`;
}


/*
============================================================
BASIC FILE SIGNATURE VALIDATION
============================================================

Não confiamos apenas no MIME enviado pelo navegador.

O conteúdo inicial do ficheiro também é verificado.

============================================================
*/

function detectFileSignature(
    buffer
) {

    if (
        !Buffer.isBuffer(
            buffer
        ) ||
        buffer.length <
        4
    ) {

        return "unknown";
    }


    /*
    JPEG
    FF D8 FF
    */

    if (
        buffer[0] === 0xFF &&
        buffer[1] === 0xD8 &&
        buffer[2] === 0xFF
    ) {

        return "image/jpeg";
    }


    /*
    PNG
    89 50 4E 47 0D 0A 1A 0A
    */

    if (
        buffer.length >=
        8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4E &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0D &&
        buffer[5] === 0x0A &&
        buffer[6] === 0x1A &&
        buffer[7] === 0x0A
    ) {

        return "image/png";
    }


    /*
    WEBP
    RIFF....WEBP
    */

    if (
        buffer.length >=
        12 &&
        buffer.toString(
            "ascii",
            0,
            4
        ) ===
        "RIFF" &&
        buffer.toString(
            "ascii",
            8,
            12
        ) ===
        "WEBP"
    ) {

        return "image/webp";
    }


    /*
    PDF
    %PDF
    */

    if (
        buffer.toString(
            "ascii",
            0,
            4
        ) ===
        "%PDF"
    ) {

        return "application/pdf";
    }


    return "unknown";
}


/*
============================================================
FILE VALIDATION
============================================================
*/

function validateFile(
    file
) {

    if (
        !file
    ) {

        throw createError(
            "Nenhum comprovativo foi enviado.",
            "PROOF_FILE_REQUIRED"
        );
    }


    if (
        !Buffer.isBuffer(
            file.buffer
        )
    ) {

        throw createError(
            "O ficheiro enviado é inválido.",
            "INVALID_PROOF_FILE"
        );
    }


    const size =
        file.buffer.length;


    if (
        size <
        MIN_FILE_SIZE
    ) {

        throw createError(
            "O comprovativo enviado está vazio ou é demasiado pequeno.",
            "PROOF_FILE_TOO_SMALL"
        );
    }


    if (
        size >
        MAX_FILE_SIZE
    ) {

        throw createError(
            "O comprovativo não pode ultrapassar 10 MB.",
            "PROOF_FILE_TOO_LARGE",
            413
        );
    }


    const mimeType =
        normalizeMime(
            file.mimetype
        );


    const extension =
        getExtension(
            file.originalname
        );


    if (
        !ALLOWED_MIME_TYPES[
            mimeType
        ]
    ) {

        throw createError(
            "Formato de comprovativo não suportado. Envie JPG, PNG, WEBP ou PDF.",
            "PROOF_FILE_TYPE_NOT_ALLOWED",
            415
        );
    }


    if (
        !ALLOWED_EXTENSIONS.has(
            extension
        )
    ) {

        throw createError(
            "A extensão do comprovativo não é permitida.",
            "PROOF_FILE_EXTENSION_NOT_ALLOWED",
            415
        );
    }


    const detectedType =
        detectFileSignature(
            file.buffer
        );


    /*
    --------------------------------------------------------
    JPEG/JPG
    --------------------------------------------------------
    */

    if (
        mimeType ===
        "image/jpeg"
    ) {

        if (
            detectedType !==
            "image/jpeg"
        ) {

            throw createError(
                "O conteúdo do ficheiro não corresponde a uma imagem JPEG válida.",
                "PROOF_FILE_SIGNATURE_MISMATCH",
                415
            );
        }
    }


    /*
    --------------------------------------------------------
    PNG
    --------------------------------------------------------
    */

    if (
        mimeType ===
        "image/png"
    ) {

        if (
            detectedType !==
            "image/png"
        ) {

            throw createError(
                "O conteúdo do ficheiro não corresponde a uma imagem PNG válida.",
                "PROOF_FILE_SIGNATURE_MISMATCH",
                415
            );
        }
    }


    /*
    --------------------------------------------------------
    WEBP
    --------------------------------------------------------
    */

    if (
        mimeType ===
        "image/webp"
    ) {

        if (
            detectedType !==
            "image/webp"
        ) {

            throw createError(
                "O conteúdo do ficheiro não corresponde a uma imagem WEBP válida.",
                "PROOF_FILE_SIGNATURE_MISMATCH",
                415
            );
        }
    }


    /*
    --------------------------------------------------------
    PDF
    --------------------------------------------------------
    */

    if (
        mimeType ===
        "application/pdf"
    ) {

        if (
            detectedType !==
            "application/pdf"
        ) {

            throw createError(
                "O conteúdo do ficheiro não corresponde a um PDF válido.",
                "PROOF_FILE_SIGNATURE_MISMATCH",
                415
            );
        }
    }


    return {

        mimeType,

        extension,

        size,

        detectedType
    };
}


/*
============================================================
GRIDFS
============================================================
*/

function getGridFSBucket(
    db
) {

    return new GridFSBucket(
        db,
        {

            bucketName:
                BUCKET_NAME
        }
    );
}


/*
============================================================
UPLOAD BUFFER TO GRIDFS
============================================================
*/

function uploadBufferToGridFS(
    bucket,
    buffer,
    filename,
    metadata
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const uploadStream =
                bucket.openUploadStream(
                    filename,
                    {

                        metadata,

                        contentType:
                            metadata.contentType
                    }
                );


            uploadStream.on(
                "error",
                reject
            );


            uploadStream.on(
                "finish",
                () => {

                    resolve(
                        uploadStream.id
                    );
                }
            );


            uploadStream.end(
                buffer
            );
        }
    );
}


/*
============================================================
DELETE GRIDFS FILE
============================================================
*/

async function deleteGridFSFile(
    bucket,
    fileId
) {

    if (
        !fileId
    ) {

        return;
    }


    try {

        await bucket.delete(
            fileId
        );

    }

    catch (
        error
    ) {

        /*
        ----------------------------------------------------
        Se o ficheiro já não existir, não interrompemos a
        operação principal.
        ----------------------------------------------------
        */

        if (
            error?.codeName ===
            "FileNotFound"
        ) {

            return;
        }


        throw error;
    }
}


/*
============================================================
FIND INVOICE BY PUBLIC TOKEN
============================================================
*/

async function getInvoiceForProof(
    publicToken
) {

    const invoice =
        await getPublicInvoice(
            publicToken
        );


    return invoice;
}


/*
============================================================
CHECK EXISTING ACTIVE PROOF
============================================================
*/

async function findActiveProof(
    db,
    invoiceId
) {

    return db
        .collection(
            PROOF_COLLECTION
        )
        .findOne(

            {

                invoiceId,

                active:
                    true
            },

            {

                sort:
                    {
                        createdAt:
                            -1
                    }
            }
        );
}


/*
============================================================
COUNT PROOFS
============================================================
*/

async function countInvoiceProofs(
    db,
    invoiceId
) {

    return db
        .collection(
            PROOF_COLLECTION
        )
        .countDocuments(
            {
                invoiceId
            }
        );
}


/*
============================================================
DUPLICATE FINGERPRINT
============================================================

O mesmo ficheiro não deve ser reutilizado em várias
faturas.

Isto é uma primeira camada do Escudo Antifraude.

============================================================
*/

async function findFingerprintReuse(
    db,
    fingerprint,
    merchantId
) {

    return db
        .collection(
            PROOF_COLLECTION
        )
        .findOne(

            {

                fingerprint,

                merchantId,

                active:
                    true
            },

            {

                projection:
                    {

                        _id:
                            1,

                        invoiceId:
                            1,

                        createdAt:
                            1
                    }
            }
        );
}


/*
============================================================
CREATE PROOF
============================================================

Entrada esperada:

{
    publicToken,
    file: {
        buffer,
        originalname,
        mimetype
    },
    ip,
    userAgent
}

============================================================
*/

export async function createPaymentProof(
    data = {}
) {

    const publicToken =
        cleanString(
            data.publicToken,
            200
        );


    if (
        !publicToken
    ) {

        throw createError(
            "Link de pagamento inválido.",
            "INVALID_PAYMENT_LINK"
        );
    }


    const file =
        data.file;


    const validation =
        validateFile(
            file
        );


    /*
    --------------------------------------------------------
    Obter fatura através do token público.
    --------------------------------------------------------
    */

    const publicInvoice =
        await getInvoiceForProof(
            publicToken
        );


    const invoiceId =
        normalizeObjectId(

            publicInvoice.id,

            "INVALID_INVOICE_ID",

            "Fatura inválida."
        );


    const merchantId =
        normalizeObjectId(

            publicInvoice.merchantId ||
            null,

            "INVALID_MERCHANT_ID",

            "Comerciante inválido."
        );


    /*
    --------------------------------------------------------
    O checkout público não devolve merchantId.

    Para manter a função segura, fazemos uma segunda consulta
    diretamente no banco através do invoiceId.
    --------------------------------------------------------
    */

    const db =
        await getDatabase();


    const invoice =
        await db
            .collection(
                "invoices"
            )
            .findOne(
                {
                    _id:
                        invoiceId
                }
            );


    if (
        !invoice
    ) {

        throw createError(
            "Fatura não encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );
    }


    const actualMerchantId =
        invoice.merchantId;


    /*
    --------------------------------------------------------
    Estados que aceitam comprovativo.
    --------------------------------------------------------
    */

    const acceptedStatuses =
        new Set([

            "PENDING",
            "REJECTED"

        ]);


    if (
        !acceptedStatuses.has(
            invoice.status
        )
    ) {

        if (
            invoice.status ===
            "PAID"
        ) {

            throw createError(
                "Esta fatura já foi paga.",
                "INVOICE_ALREADY_PAID",
                409
            );
        }


        if (
            invoice.status ===
            "CANCELLED"
        ) {

            throw createError(
                "Esta fatura foi cancelada.",
                "INVOICE_CANCELLED",
                409
            );
        }


        if (
            invoice.status ===
            "EXPIRED"
        ) {

            throw createError(
                "Esta fatura expirou.",
                "INVOICE_EXPIRED",
                409
            );
        }


        throw createError(
            "Esta fatura não está disponível para receber um comprovativo.",
            "INVOICE_PROOF_NOT_ALLOWED",
            409
        );
    }


    /*
    --------------------------------------------------------
    Verificar expiração.
    --------------------------------------------------------
    */

    if (
        invoice.expirationAt &&
        new Date(
            invoice.expirationAt
        ).getTime() <=
        Date.now()
    ) {

        await db
            .collection(
                "invoices"
            )
            .updateOne(

                {

                    _id:
                        invoice._id,

                    status:
                        {
                            $in:
                                [
                                    "PENDING",
                                    "REJECTED"
                                ]
                        }
                },

                {

                    $set:
                        {

                            status:
                                "EXPIRED",

                            updatedAt:
                                new Date()
                        }
                }
            );


        throw createError(
            "Esta fatura expirou.",
            "INVOICE_EXPIRED",
            409
        );
    }


    /*
    --------------------------------------------------------
    Limite de comprovativos.
    --------------------------------------------------------
    */

    const proofCount =
        await countInvoiceProofs(

            db,

            invoice._id
        );


    if (
        proofCount >=
        MAX_PROOFS_PER_INVOICE
    ) {

        throw createError(
            "Esta fatura atingiu o limite de comprovativos enviados.",
            "PROOF_LIMIT_REACHED",
            409
        );
    }


    /*
    --------------------------------------------------------
    Não permitir dois comprovativos ativos simultaneamente.
    --------------------------------------------------------
    */

    const activeProof =
        await findActiveProof(

            db,

            invoice._id
        );


    if (
        activeProof
    ) {

        throw createError(
            "Já existe um comprovativo em análise para esta fatura.",
            "ACTIVE_PROOF_EXISTS",
            409
        );
    }


    /*
    --------------------------------------------------------
    Fingerprint.
    --------------------------------------------------------
    */

    const fingerprint =
        calculateHash(
            file.buffer
        );


    /*
    --------------------------------------------------------
    Verificar reutilização do ficheiro.
    --------------------------------------------------------
    */

    const reusedProof =
        await findFingerprintReuse(

            db,

            fingerprint,

            actualMerchantId
        );


    if (
        reusedProof
    ) {

        throw createError(

            "Este comprovativo já foi utilizado noutra fatura e não pode ser reutilizado.",

            "PROOF_REUSE_DETECTED",

            409,

            {

                protection:
                    "ANTI_FRAUD_REUSE_BLOCK",

                relatedInvoiceId:
                    String(
                        reusedProof.invoiceId
                    )
            }
        );
    }


    /*
    --------------------------------------------------------
    Nome seguro para armazenamento.
    --------------------------------------------------------
    */

    const storageExtension =
        ALLOWED_MIME_TYPES[
            validation.mimeType
        ];


    const storageName =
        generateStorageName(
            storageExtension
        );


    const bucket =
        getGridFSBucket(
            db
        );


    const now =
        new Date();


    let gridFsId =
        null;


    try {

        /*
        ----------------------------------------------------
        Guardar ficheiro no GridFS.
        ----------------------------------------------------
        */

        gridFsId =
            await uploadBufferToGridFS(

                bucket,

                file.buffer,

                storageName,

                {

                    contentType:
                        validation.mimeType,

                    originalName:
                        cleanString(
                            file.originalname,
                            255
                        ),

                    merchantId:
                        actualMerchantId,

                    invoiceId:
                        invoice._id,

                    fingerprint
                }
            );


        /*
        ----------------------------------------------------
        Criar documento de controlo.
        ----------------------------------------------------
        */

        const proofDocument = {

            invoiceId:
                invoice._id,

            merchantId:
                actualMerchantId,

            fileId:
                gridFsId,

            storageName,

            originalName:
                cleanString(
                    file.originalname,
                    255
                ),

            mimeType:
                validation.mimeType,

            extension:
                validation.extension,

            size:
                validation.size,

            fingerprint,

            status:
                "SUBMITTED",

            active:
                true,

            submittedAt:
                now,

            createdAt:
                now,

            updatedAt:
                now,

            submittedIp:
                cleanString(
                    data.ip,
                    100
                ) ||
                null,

            submittedUserAgent:
                cleanString(
                    data.userAgent,
                    500
                ) ||
                null,

            review: {

                status:
                    "PENDING",

                reviewedAt:
                    null,

                reviewedBy:
                    null,

                reason:
                    null
            }
        };


        const insertResult =
            await db
                .collection(
                    PROOF_COLLECTION
                )
                .insertOne(
                    proofDocument
                );


        proofDocument._id =
            insertResult.insertedId;


        /*
        ----------------------------------------------------
        Atualizar estado da fatura.
        ----------------------------------------------------
        */

        try {

            await markProofSubmitted(
                invoice._id
            );

        }

        catch (
            invoiceError
        ) {

            /*
            ------------------------------------------------
            Rollback.

            Se a fatura não puder receber o comprovativo,
            eliminamos o ficheiro e o documento criado.
            ------------------------------------------------
            */

            await db
                .collection(
                    PROOF_COLLECTION
                )
                .deleteOne(
                    {
                        _id:
                            proofDocument._id
                    }
                );


            await deleteGridFSFile(

                bucket,

                gridFsId
            );


            throw invoiceError;
        }


        return {

            id:
                String(
                    proofDocument._id
                ),

            invoiceId:
                String(
                    proofDocument.invoiceId
                ),

            status:
                proofDocument.status,

            filename:
                proofDocument.originalName,

            mimeType:
                proofDocument.mimeType,

            size:
                proofDocument.size,

            submittedAt:
                proofDocument.submittedAt,

            security: {

                fingerprint:
                    fingerprint,

                reuseCheck:
                    "PASSED",

                storage:
                    "MONGODB_GRIDFS"
            }
        };
    }

    catch (
        error
    ) {

        /*
        ----------------------------------------------------
        Se o ficheiro foi criado mas a operação posterior
        falhou, fazemos limpeza.
        ----------------------------------------------------
        */

        if (
            gridFsId
        ) {

            try {

                await deleteGridFSFile(

                    bucket,

                    gridFsId
                );

            }

            catch (
                cleanupError
            ) {

                console.error(
                    "[HONEY PAY] Proof cleanup failed:",
                    cleanupError
                );
            }
        }


        throw error;
    }
}


/*
============================================================
GET PROOF FOR MERCHANT
============================================================
*/

export async function getPaymentProof(
    merchantId,
    proofId
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedProofId =
        normalizeObjectId(

            proofId,

            "INVALID_PROOF_ID",

            "Identificador do comprovativo inválido."
        );


    const db =
        await getDatabase();


    const proof =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedProofId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        !proof
    ) {

        throw createError(
            "Comprovativo não encontrado.",
            "PROOF_NOT_FOUND",
            404
        );
    }


    return {

        id:
            String(
                proof._id
            ),

        invoiceId:
            String(
                proof.invoiceId
            ),

        status:
            proof.status,

        originalName:
            proof.originalName,

        mimeType:
            proof.mimeType,

        extension:
            proof.extension,

        size:
            proof.size,

        submittedAt:
            proof.submittedAt,

        createdAt:
            proof.createdAt,

        updatedAt:
            proof.updatedAt,

        review:
            proof.review || {

                status:
                    "PENDING",

                reviewedAt:
                    null,

                reviewedBy:
                    null,

                reason:
                    null
            },

        fraud: {

            fingerprint:
                proof.fingerprint,

            active:
                proof.active
        }
    };
}


/*
============================================================
LIST PROOFS FOR INVOICE
============================================================
*/

export async function listInvoiceProofs(
    merchantId,
    invoiceId
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedInvoiceId =
        normalizeObjectId(

            invoiceId,

            "INVALID_INVOICE_ID",

            "Identificador da fatura inválido."
        );


    const db =
        await getDatabase();


    const documents =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .find(
                {

                    merchantId:
                        normalizedMerchantId,

                    invoiceId:
                        normalizedInvoiceId
                }
            )
            .sort(
                {

                    createdAt:
                        -1
                }
            )
            .toArray();


    return {

        items:
            documents.map(
                proof => ({

                    id:
                        String(
                            proof._id
                        ),

                    invoiceId:
                        String(
                            proof.invoiceId
                        ),

                    status:
                        proof.status,

                    originalName:
                        proof.originalName,

                    mimeType:
                        proof.mimeType,

                    extension:
                        proof.extension,

                    size:
                        proof.size,

                    submittedAt:
                        proof.submittedAt,

                    createdAt:
                        proof.createdAt,

                    review:
                        proof.review || {

                            status:
                                "PENDING"
                        },

                    active:
                        proof.active
                })
            ),

        total:
            documents.length
    };
}


/*
============================================================
DOWNLOAD / STREAM PROOF
============================================================

Retorna o stream para a rota HTTP.

A autorização deve ser feita pelo merchantId.

============================================================
*/

export async function getPaymentProofStream(
    merchantId,
    proofId
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedProofId =
        normalizeObjectId(

            proofId,

            "INVALID_PROOF_ID",

            "Identificador do comprovativo inválido."
        );


    const db =
        await getDatabase();


    const proof =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedProofId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        !proof
    ) {

        throw createError(
            "Comprovativo não encontrado.",
            "PROOF_NOT_FOUND",
            404
        );
    }


    const bucket =
        getGridFSBucket(
            db
        );


    return {

        stream:
            bucket.openDownloadStream(
                proof.fileId
            ),

        mimeType:
            proof.mimeType,

        filename:
            proof.originalName,

        size:
            proof.size,

        proof
    };
}


/*
============================================================
MARK PROOF UNDER REVIEW
============================================================
*/

export async function reviewPaymentProof(
    merchantId,
    proofId,
    options = {}
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedProofId =
        normalizeObjectId(

            proofId,

            "INVALID_PROOF_ID",

            "Identificador do comprovativo inválido."
        );


    const db =
        await getDatabase();


    const proof =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedProofId,

                    merchantId:
                        normalizedMerchantId,

                    active:
                        true
                }
            );


    if (
        !proof
    ) {

        throw createError(
            "Comprovativo não encontrado.",
            "PROOF_NOT_FOUND",
            404
        );
    }


    if (
        proof.status ===
        "APPROVED"
    ) {

        return getPaymentProof(

            normalizedMerchantId,

            normalizedProofId
        );
    }


    if (
        proof.status ===
        "REJECTED"
    ) {

        throw createError(
            "Este comprovativo já foi rejeitado.",
            "PROOF_ALREADY_REJECTED",
            409
        );
    }


    const invoice =
        await db
            .collection(
                "invoices"
            )
            .findOne(
                {
                    _id:
                        proof.invoiceId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        !invoice
    ) {

        throw createError(
            "A fatura associada ao comprovativo não foi encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );
    }


    /*
    --------------------------------------------------------
    Colocar fatura em revisão.
    --------------------------------------------------------
    */

    if (
        invoice.status ===
        "PROOF_SUBMITTED"
    ) {

        await markInvoiceUnderReview(
            invoice._id
        );
    }


    const now =
        new Date();


    const reviewer =
        cleanString(
            options.reviewer,
            200
        ) ||
        "merchant";


    const result =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        proof._id,

                    merchantId:
                        normalizedMerchantId,

                    active:
                        true
                },

                {

                    $set:
                        {

                            status:
                                "UNDER_REVIEW",

                            updatedAt:
                                now,

                            review: {

                                status:
                                    "UNDER_REVIEW",

                                reviewedAt:
                                    now,

                                reviewedBy:
                                    reviewer,

                                reason:
                                    null
                            }
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


    const updated =
        result?.value ||
        result;


    if (
        !updated
    ) {

        throw createError(
            "Não foi possível colocar o comprovativo em revisão.",
            "PROOF_REVIEW_FAILED",
            500
        );
    }


    return getPaymentProof(

        normalizedMerchantId,

        normalizedProofId
    );
}


/*
============================================================
REJECT PAYMENT PROOF
============================================================
*/

export async function rejectPaymentProof(
    merchantId,
    proofId,
    reason
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedProofId =
        normalizeObjectId(

            proofId,

            "INVALID_PROOF_ID",

            "Identificador do comprovativo inválido."
        );


    const rejectionReason =
        cleanString(
            reason,
            1000
        );


    if (
        !rejectionReason
    ) {

        throw createError(
            "É obrigatório informar o motivo da rejeição.",
            "REJECTION_REASON_REQUIRED"
        );
    }


    const db =
        await getDatabase();


    const proof =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedProofId,

                    merchantId:
                        normalizedMerchantId,

                    active:
                        true
                }
            );


    if (
        !proof
    ) {

        throw createError(
            "Comprovativo não encontrado.",
            "PROOF_NOT_FOUND",
            404
        );
    }


    if (
        proof.status ===
        "APPROVED"
    ) {

        throw createError(
            "Um comprovativo aprovado não pode ser rejeitado.",
            "APPROVED_PROOF_CANNOT_BE_REJECTED",
            409
        );
    }


    const now =
        new Date();


    const result =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        proof._id,

                    merchantId:
                        normalizedMerchantId,

                    active:
                        true
                },

                {

                    $set:
                        {

                            status:
                                "REJECTED",

                            active:
                                false,

                            updatedAt:
                                now,

                            review: {

                                status:
                                    "REJECTED",

                                reviewedAt:
                                    now,

                                reviewedBy:
                                    "merchant",

                                reason:
                                    rejectionReason
                            }
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


    const rejected =
        result?.value ||
        result;


    if (
        !rejected
    ) {

        throw createError(
            "Não foi possível rejeitar o comprovativo.",
            "PROOF_REJECTION_FAILED",
            500
        );
    }


    /*
    --------------------------------------------------------
    A fatura volta para PENDING.

    Isto permite ao cliente enviar um novo comprovativo
    depois de corrigir o pagamento.
    --------------------------------------------------------
    */

    await db
        .collection(
            "invoices"
        )
        .updateOne(

            {

                _id:
                    proof.invoiceId,

                merchantId:
                    normalizedMerchantId
            },

            {

                $set:
                    {

                        status:
                            "REJECTED",

                        updatedAt:
                            now,

                        updatedBy:
                            "merchant"
                    }
            }
        );


    return getPaymentProof(

        normalizedMerchantId,

        normalizedProofId
    );
}


/*
============================================================
APPROVE PAYMENT PROOF
============================================================

IMPORTANTE:

Aprovar o comprovativo NÃO significa confiar cegamente
no ficheiro.

A confirmação deve ocorrer através do fluxo de pagamento.

Nesta V1, a aprovação final chama markInvoicePaid.

============================================================
*/

export async function approvePaymentProof(
    merchantId,
    proofId,
    options = {}
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedProofId =
        normalizeObjectId(

            proofId,

            "INVALID_PROOF_ID",

            "Identificador do comprovativo inválido."
        );


    const db =
        await getDatabase();


    const proof =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedProofId,

                    merchantId:
                        normalizedMerchantId,

                    active:
                        true
                }
            );


    if (
        !proof
    ) {

        throw createError(
            "Comprovativo não encontrado.",
            "PROOF_NOT_FOUND",
            404
        );
    }


    if (
        proof.status ===
        "REJECTED"
    ) {

        throw createError(
            "Este comprovativo já foi rejeitado.",
            "PROOF_ALREADY_REJECTED",
            409
        );
    }


    if (
        proof.status ===
        "APPROVED"
    ) {

        return getPaymentProof(

            normalizedMerchantId,

            normalizedProofId
        );
    }


    const invoice =
        await db
            .collection(
                "invoices"
            )
            .findOne(
                {

                    _id:
                        proof.invoiceId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        !invoice
    ) {

        throw createError(
            "A fatura associada não foi encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );
    }


    if (
        invoice.status ===
        "CANCELLED"
    ) {

        throw createError(
            "A fatura foi cancelada.",
            "INVOICE_CANCELLED",
            409
        );
    }


    if (
        invoice.status ===
        "PAID"
    ) {

        throw createError(
            "A fatura já está marcada como paga.",
            "INVOICE_ALREADY_PAID",
            409
        );
    }


    /*
    --------------------------------------------------------
    Confirmar pagamento através do serviço de faturas.
    --------------------------------------------------------
    */

    const {
        markInvoicePaid
    } =
        await import(
            "./invoice.js"
        );


    await markInvoicePaid(

        invoice._id,

        {

            updatedBy:
                "merchant",

            paymentReference:
                options.paymentReference ||
                null
        }
    );


    const now =
        new Date();


    const result =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        proof._id,

                    merchantId:
                        normalizedMerchantId,

                    active:
                        true
                },

                {

                    $set:
                        {

                            status:
                                "APPROVED",

                            active:
                                true,

                            updatedAt:
                                now,

                            review: {

                                status:
                                    "APPROVED",

                                reviewedAt:
                                    now,

                                reviewedBy:
                                    "merchant",

                                reason:
                                    null
                            }
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


    const approved =
        result?.value ||
        result;


    if (
        !approved
    ) {

        throw createError(
            "O pagamento foi confirmado, mas o comprovativo não pôde ser atualizado.",
            "PROOF_APPROVAL_UPDATE_FAILED",
            500
        );
    }


    return getPaymentProof(

        normalizedMerchantId,

        normalizedProofId
    );
}


/*
============================================================
ANTI-FRAUD STATISTICS
============================================================
*/

export async function getProofSecurityStatistics(
    merchantId
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const db =
        await getDatabase();


    const result =
        await db
            .collection(
                PROOF_COLLECTION
            )
            .aggregate(
                [

                    {
                        $match:
                            {

                                merchantId:
                                    normalizedMerchantId
                            }
                    },

                    {
                        $group:
                            {

                                _id:
                                    null,

                                total:
                                    {
                                        $sum:
                                            1
                                    },

                                submitted:
                                    {
                                        $sum:
                                            {
                                                $cond:
                                                    [
                                                        {
                                                            $eq:
                                                                [
                                                                    "$status",
                                                                    "SUBMITTED"
                                                                ]
                                                        },
                                                        1,
                                                        0
                                                    ]
                                            }
                                    },

                                underReview:
                                    {
                                        $sum:
                                            {
                                                $cond:
                                                    [
                                                        {
                                                            $eq:
                                                                [
                                                                    "$status",
                                                                    "UNDER_REVIEW"
                                                                ]
                                                        },
                                                        1,
                                                        0
                                                    ]
                                            }
                                    },

                                approved:
                                    {
                                        $sum:
                                            {
                                                $cond:
                                                    [
                                                        {
                                                            $eq:
                                                                [
                                                                    "$status",
                                                                    "APPROVED"
                                                                ]
                                                        },
                                                        1,
                                                        0
                                                    ]
                                            }
                                    },

                                rejected:
                                    {
                                        $sum:
                                            {
                                                $cond:
                                                    [
                                                        {
                                                            $eq:
                                                                [
                                                                    "$status",
                                                                    "REJECTED"
                                                                ]
                                                        },
                                                        1,
                                                        0
                                                    ]
                                            }
                                    }
                            }
                    }
                ]
            )
            .toArray();


    return (

        result[0] ||

        {

            total:
                0,

            submitted:
                0,

            underReview:
                0,

            approved:
                0,

            rejected:
                0
        }
    );
}


/*
============================================================
INDEXES
============================================================
*/

export async function ensureProofIndexes() {

    const db =
        await getDatabase();


    const collection =
        db.collection(
            PROOF_COLLECTION
        );


    await collection.createIndex(

        {

            merchantId:
                1,

            invoiceId:
                1,

            createdAt:
                -1
        }
    );


    await collection.createIndex(

        {

            merchantId:
                1,

            fingerprint:
                1
        }
    );


    await collection.createIndex(

        {

            merchantId:
                1,

            active:
                1,

            createdAt:
                -1
        }
    );


    await collection.createIndex(

        {

            invoiceId:
                1,

            active:
                1
        }
    );


    return {

        collection:
            PROOF_COLLECTION,

        gridFsBucket:
            BUCKET_NAME,

        indexes:
            "ready"
    };
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    createPaymentProof,

    getPaymentProof,

    listInvoiceProofs,

    getPaymentProofStream,

    reviewPaymentProof,

    rejectPaymentProof,

    approvePaymentProof,

    getProofSecurityStatistics,

    ensureProofIndexes
};
