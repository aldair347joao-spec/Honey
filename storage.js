/*
============================================================
HONEY PAY
SECURE FILE STORAGE
V1.0.0
============================================================

ARMAZENAMENTO SEGURO DE COMPROVATIVOS

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Guardar ficheiros temporariamente
- Gerar nomes internos seguros
- Nunca confiar no nome original enviado pelo cliente
- Validar tamanho
- Validar MIME type
- Impedir extensões perigosas
- Criar diretórios necessários
- Ler ficheiros armazenados
- Remover ficheiros
- Preparar futura migração para object storage

------------------------------------------------------------
IMPORTANTE
------------------------------------------------------------

O nome original do ficheiro NÃO é utilizado como nome físico.

Exemplo:

comprovativo-transferencia.png

torna-se:

payment_<uuid>.png

============================================================
*/

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";


/*
============================================================
CONFIGURAÇÃO
============================================================
*/

const STORAGE_ROOT =
    path.resolve(
        process.env.STORAGE_PATH ||
        "./storage"
    );


const RECEIPTS_DIRECTORY =
    path.join(
        STORAGE_ROOT,
        "receipts"
    );


const MAX_FILE_SIZE =
    10 *
    1024 *
    1024;


const ALLOWED_MIME_TYPES =
    new Set([

        "image/jpeg",

        "image/png",

        "image/webp",

        "application/pdf"
    ]);


/*
============================================================
EXTENSIONS
============================================================
*/

const MIME_TO_EXTENSION = {

    "image/jpeg":
        ".jpg",

    "image/png":
        ".png",

    "image/webp":
        ".webp",

    "application/pdf":
        ".pdf"
};


/*
============================================================
INITIALIZE STORAGE
============================================================
*/

export async function initializeStorage() {

    await fs.mkdir(
        RECEIPTS_DIRECTORY,
        {
            recursive:
                true
        }
    );
}


/*
============================================================
VALIDATE MIME TYPE
============================================================
*/

function validateMimeType(
    mimeType
) {

    if (
        !ALLOWED_MIME_TYPES.has(
            mimeType
        )
    ) {

        const error =
            new Error(
                "Tipo de ficheiro não permitido."
            );


        error.code =
            "STORAGE_INVALID_FILE_TYPE";


        error.statusCode =
            415;


        throw error;
    }
}


/*
============================================================
VALIDATE FILE SIZE
============================================================
*/

function validateFileSize(
    size
) {

    const numericSize =
        Number(
            size
        );


    if (
        !Number.isFinite(
            numericSize
        ) ||
        numericSize <=
        0
    ) {

        const error =
            new Error(
                "Tamanho de ficheiro inválido."
            );


        error.code =
            "STORAGE_INVALID_FILE_SIZE";


        error.statusCode =
            400;


        throw error;
    }


    if (
        numericSize >
        MAX_FILE_SIZE
    ) {

        const error =
            new Error(
                "O ficheiro ultrapassa o limite de 10 MB."
            );


        error.code =
            "STORAGE_FILE_TOO_LARGE";


        error.statusCode =
            413;


        throw error;
    }
}


/*
============================================================
GET SAFE EXTENSION
============================================================
*/

function getSafeExtension(
    mimeType
) {

    const extension =
        MIME_TO_EXTENSION[
            mimeType
        ];


    if (
        !extension
    ) {

        const error =
            new Error(
                "Não foi possível determinar uma extensão segura."
            );


        error.code =
            "STORAGE_EXTENSION_ERROR";


        error.statusCode =
            415;


        throw error;
    }


    return extension;
}


/*
============================================================
GENERATE STORAGE NAME
============================================================
*/

function generateStorageName(
    mimeType
) {

    const randomId =
        crypto.randomUUID();


    const extension =
        getSafeExtension(
            mimeType
        );


    return (
        `payment_${randomId}${extension}`
    );
}


/*
============================================================
SANITIZE ORIGINAL NAME
============================================================
*/

export function sanitizeOriginalName(
    originalName
) {

    if (
        typeof originalName !==
        "string"
    ) {

        return "receipt";
    }


    return originalName

        .normalize(
            "NFKC"
        )

        .replace(
            /[\u0000-\u001F\u007F]/g,
            ""
        )

        .replace(
            /[/\\]/g,
            "_"
        )

        .replace(
            /\.\./g,
            "_"
        )

        .trim()

        .slice(
            0,
            180
        ) ||

        "receipt";
}


/*
============================================================
BUILD RECEIPT PATH
============================================================
*/

function buildReceiptPath(
    storageName
) {

    return path.join(
        RECEIPTS_DIRECTORY,
        storageName
    );
}


/*
============================================================
ENSURE PATH IS INSIDE STORAGE
============================================================
*/

function ensureSafeStoragePath(
    targetPath
) {

    const resolvedRoot =
        path.resolve(
            RECEIPTS_DIRECTORY
        );


    const resolvedTarget =
        path.resolve(
            targetPath
        );


    if (
        resolvedTarget !==
            resolvedRoot &&
        !resolvedTarget.startsWith(
            `${resolvedRoot}${path.sep}`
        )
    ) {

        const error =
            new Error(
                "Caminho de armazenamento inválido."
            );


        error.code =
            "STORAGE_PATH_VIOLATION";


        error.statusCode =
            500;


        throw error;
    }


    return resolvedTarget;
}


/*
============================================================
STORE RECEIPT
============================================================
*/

export async function storeReceipt(
    file
) {

    if (
        !file
    ) {

        const error =
            new Error(
                "Nenhum ficheiro foi fornecido."
            );


        error.code =
            "STORAGE_FILE_REQUIRED";


        error.statusCode =
            400;


        throw error;
    }


    if (
        !Buffer.isBuffer(
            file.buffer
        )
    ) {

        const error =
            new Error(
                "O conteúdo do ficheiro é inválido."
            );


        error.code =
            "STORAGE_INVALID_BUFFER";


        error.statusCode =
            400;


        throw error;
    }


    validateFileSize(
        file.size ||
        file.buffer.length
    );


    validateMimeType(
        file.mimetype
    );


    await initializeStorage();


    const storageName =
        generateStorageName(
            file.mimetype
        );


    const targetPath =
        ensureSafeStoragePath(
            buildReceiptPath(
                storageName
            )
        );


    await fs.writeFile(
        targetPath,
        file.buffer,
        {
            flag:
                "wx",
            mode:
                0o600
        }
    );


    return {

        storageName,

        storagePath:
            targetPath,

        originalName:
            sanitizeOriginalName(
                file.originalname
            ),

        mimeType:
            file.mimetype,

        size:
            file.size ||
            file.buffer.length
    };
}


/*
============================================================
READ RECEIPT
============================================================
*/

export async function readReceipt(
    storageName
) {

    if (
        typeof storageName !==
        "string" ||
        !storageName.trim()
    ) {

        const error =
            new Error(
                "Identificador do ficheiro inválido."
            );


        error.code =
            "STORAGE_INVALID_NAME";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Não aceitar caminhos.
    --------------------------------------------------------
    */

    if (
        storageName.includes(
            "/"
        ) ||
        storageName.includes(
            "\\"
        ) ||
        storageName.includes(
            ".."
        )
    ) {

        const error =
            new Error(
                "Nome de ficheiro inválido."
            );


        error.code =
            "STORAGE_PATH_TRAVERSAL";


        error.statusCode =
            400;


        throw error;
    }


    const targetPath =
        ensureSafeStoragePath(
            buildReceiptPath(
                storageName
            )
        );


    return fs.readFile(
        targetPath
    );
}


/*
============================================================
DELETE RECEIPT
============================================================
*/

export async function deleteReceipt(
    storageName
) {

    if (
        typeof storageName !==
        "string" ||
        !storageName.trim()
    ) {

        const error =
            new Error(
                "Identificador do ficheiro inválido."
            );


        error.code =
            "STORAGE_INVALID_NAME";


        error.statusCode =
            400;


        throw error;
    }


    if (
        storageName.includes(
            "/"
        ) ||
        storageName.includes(
            "\\"
        ) ||
        storageName.includes(
            ".."
        )
    ) {

        const error =
            new Error(
                "Nome de ficheiro inválido."
            );


        error.code =
            "STORAGE_PATH_TRAVERSAL";


        error.statusCode =
            400;


        throw error;
    }


    const targetPath =
        ensureSafeStoragePath(
            buildReceiptPath(
                storageName
            )
        );


    try {

        await fs.unlink(
            targetPath
        );

    }

    catch (error) {

        if (
            error.code ===
            "ENOENT"
        ) {

            return {

                deleted:
                    false,

                notFound:
                    true
            };
        }


        throw error;
    }


    return {

        deleted:
            true
    };
}


/*
============================================================
FILE EXISTS
============================================================
*/

export async function receiptExists(
    storageName
) {

    if (
        typeof storageName !==
        "string" ||
        !storageName.trim()
    ) {

        return false;
    }


    if (
        storageName.includes(
            "/"
        ) ||
        storageName.includes(
            "\\"
        ) ||
        storageName.includes(
            ".."
        )
    ) {

        return false;
    }


    const targetPath =
        ensureSafeStoragePath(
            buildReceiptPath(
                storageName
            )
        );


    try {

        await fs.access(
            targetPath
        );


        return true;

    }

    catch {

        return false;
    }
}


/*
============================================================
GET STORAGE INFORMATION
============================================================
*/

export function getStorageInfo() {

    return {

        type:
            "local",

        root:
            STORAGE_ROOT,

        receiptsDirectory:
            RECEIPTS_DIRECTORY,

        maxFileSize:
            MAX_FILE_SIZE,

        allowedMimeTypes:
            Array.from(
                ALLOWED_MIME_TYPES
            )
    };
}


/*
============================================================
HEALTH CHECK
============================================================
*/

export async function storageHealthCheck() {

    try {

        await initializeStorage();


        await fs.access(
            RECEIPTS_DIRECTORY
        );


        return {

            healthy:
                true,

            type:
                "local"
        };

    }

    catch (error) {

        return {

            healthy:
                false,

            type:
                "local",

            error:
                error.message
        };
    }
}


/*
============================================================
EXPORT DEFAULT
============================================================
*/

export default {

    initializeStorage,

    storeReceipt,

    readReceipt,

    deleteReceipt,

    receiptExists,

    sanitizeOriginalName,

    getStorageInfo,

    storageHealthCheck
};
