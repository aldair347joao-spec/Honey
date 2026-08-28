import {
    normalizeEmail,
    normalizePhone,
    normalizeIban,
    sanitizeString,
    parseAmountKz
} from "./security.js";


/*
============================================================
HONEY PAY
VALIDATORS
V1.0.0
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Validação de dados recebidos pela API
- Normalização de dados
- Validação de email
- Validação de telefone
- Validação de IBAN
- Validação de nomes
- Validação de valores em Kz
- Validação de slug
- Validação de IDs MongoDB
- Validação de paginação

REGRA PRINCIPAL
------------------------------------------------------------
Nenhum dado vindo diretamente do cliente deve ser considerado
confiável.

============================================================
*/


/*
============================================================
CONSTANTES
============================================================
*/

const MAX_NAME_LENGTH =
    150;


const MAX_BUSINESS_NAME_LENGTH =
    150;


const MAX_DESCRIPTION_LENGTH =
    500;


const MAX_EMAIL_LENGTH =
    200;


const MAX_PHONE_LENGTH =
    30;


const MAX_SLUG_LENGTH =
    100;


const MAX_IBAN_LENGTH =
    50;


/*
============================================================
VALIDATION RESULT
============================================================
*/

export function validationError(
    field,
    message
) {

    return {

        field,

        message
    };
}


/*
============================================================
REQUIRED STRING
============================================================
*/

export function validateRequiredString(
    value,
    field,
    options = {}
) {

    const {

        minLength = 1,

        maxLength = 500

    } = options;


    if (
        typeof value !==
        "string"
    ) {

        return validationError(
            field,
            `${field} é obrigatório.`
        );
    }


    const normalized =
        value.trim();


    if (
        normalized.length <
        minLength
    ) {

        return validationError(
            field,
            `${field} deve possuir pelo menos ${minLength} caracteres.`
        );
    }


    if (
        normalized.length >
        maxLength
    ) {

        return validationError(
            field,
            `${field} não pode ultrapassar ${maxLength} caracteres.`
        );
    }


    return null;
}


/*
============================================================
NAME
============================================================
*/

export function validateName(
    value,
    field = "name"
) {

    const requiredError =
        validateRequiredString(
            value,
            field,
            {

                minLength:
                    2,

                maxLength:
                    MAX_NAME_LENGTH
            }
        );


    if (
        requiredError
    ) {

        return requiredError;
    }


    /*
    --------------------------------------------------------
    Evita caracteres de controle.
    --------------------------------------------------------
    */

    if (
        /[\u0000-\u001F\u007F]/.test(
            value
        )
    ) {

        return validationError(
            field,
            `${field} contém caracteres inválidos.`
        );
    }


    return null;
}


/*
============================================================
BUSINESS NAME
============================================================
*/

export function validateBusinessName(
    value
) {

    return validateRequiredString(
        value,
        "businessName",
        {

            minLength:
                2,

            maxLength:
                MAX_BUSINESS_NAME_LENGTH
        }
    );
}


/*
============================================================
EMAIL
============================================================
*/

export function validateEmail(
    value
) {

    const email =
        normalizeEmail(
            value
        );


    if (
        !email
    ) {

        return validationError(
            "email",
            "Email é obrigatório."
        );
    }


    if (
        email.length >
        MAX_EMAIL_LENGTH
    ) {

        return validationError(
            "email",
            "Email demasiado longo."
        );
    }


    /*
    --------------------------------------------------------
    Validação prática para emails.

    Não tentamos implementar toda a RFC.
    --------------------------------------------------------
    */

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


    if (
        !emailPattern.test(
            email
        )
    ) {

        return validationError(
            "email",
            "Introduza um email válido."
        );
    }


    return null;
}


/*
============================================================
PHONE
============================================================
*/

export function validatePhone(
    value,
    required = false
) {

    const phone =
        normalizePhone(
            value
        );


    if (
        !phone
    ) {

        if (
            required
        ) {

            return validationError(
                "phone",
                "Telefone é obrigatório."
            );
        }


        return null;
    }


    if (
        phone.length <
        9 ||
        phone.length >
        15
    ) {

        return validationError(
            "phone",
            "Introduza um número de telefone válido."
        );
    }


    return null;
}


/*
============================================================
IBAN
============================================================
*/

export function validateIban(
    value
) {

    const iban =
        normalizeIban(
            value
        );


    if (
        !iban
    ) {

        return validationError(
            "iban",
            "IBAN é obrigatório."
        );
    }


    if (
        iban.length >
        MAX_IBAN_LENGTH
    ) {

        return validationError(
            "iban",
            "IBAN demasiado longo."
        );
    }


    /*
    --------------------------------------------------------
    Estrutura internacional básica:

    2 letras
    2 dígitos
    restantes caracteres alfanuméricos
    --------------------------------------------------------
    */

    const ibanPattern =
        /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;


    if (
        !ibanPattern.test(
            iban
        )
    ) {

        return validationError(
            "iban",
            "IBAN inválido."
        );
    }


    /*
    --------------------------------------------------------
    Angola utiliza AO como código de país.

    Como a V1 é focada em Angola, exigimos AO.
    --------------------------------------------------------
    */

    if (
        !iban.startsWith(
            "AO"
        )
    ) {

        return validationError(
            "iban",
            "Na V1, apenas IBANs de Angola são aceites."
        );
    }


    return null;
}


/*
============================================================
SLUG
============================================================
*/

export function validateSlug(
    value
) {

    if (
        typeof value !==
        "string"
    ) {

        return validationError(
            "slug",
            "Slug inválido."
        );
    }


    const slug =
        value
            .trim()
            .toLowerCase();


    if (
        slug.length <
        2
    ) {

        return validationError(
            "slug",
            "Slug demasiado curto."
        );
    }


    if (
        slug.length >
        MAX_SLUG_LENGTH
    ) {

        return validationError(
            "slug",
            "Slug demasiado longo."
        );
    }


    if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            slug
        )
    ) {

        return validationError(
            "slug",
            "Slug deve conter apenas letras, números e hífens."
        );
    }


    return null;
}


/*
============================================================
DESCRIPTION
============================================================
*/

export function validateDescription(
    value,
    required = true
) {

    if (
        typeof value !==
        "string"
    ) {

        if (
            required
        ) {

            return validationError(
                "description",
                "Descrição é obrigatória."
            );
        }


        return null;
    }


    const description =
        value.trim();


    if (
        required &&
        description.length === 0
    ) {

        return validationError(
            "description",
            "Descrição é obrigatória."
        );
    }


    if (
        description.length >
        MAX_DESCRIPTION_LENGTH
    ) {

        return validationError(
            "description",
            `Descrição não pode ultrapassar ${MAX_DESCRIPTION_LENGTH} caracteres.`
        );
    }


    return null;
}


/*
============================================================
AMOUNT
============================================================
*/

export function validateAmount(
    value
) {

    const amount =
        parseAmountKz(
            value
        );


    if (
        amount === null
    ) {

        return validationError(
            "amount",
            "Valor da cobrança inválido."
        );
    }


    /*
    --------------------------------------------------------
    Limite máximo da V1.

    Evita valores absurdamente grandes.
    --------------------------------------------------------
    */

    if (
        amount >
        1000000000
    ) {

        return validationError(
            "amount",
            "Valor da cobrança excede o limite permitido."
        );
    }


    return null;
}


/*
============================================================
BANK NAME
============================================================
*/

export function validateBankName(
    value
) {

    return validateRequiredString(
        value,
        "bankName",
        {

            minLength:
                2,

            maxLength:
                120
        }
    );
}


/*
============================================================
ACCOUNT NAME
============================================================
*/

export function validateAccountName(
    value
) {

    return validateRequiredString(
        value,
        "accountName",
        {

            minLength:
                2,

            maxLength:
                150
        }
    );
}


/*
============================================================
MIME TYPE
============================================================
*/

export function validateReceiptMimeType(
    mimeType
) {

    if (
        typeof mimeType !==
        "string"
    ) {

        return validationError(
            "file",
            "Tipo de arquivo inválido."
        );
    }


    const allowedTypes = new Set([

        "image/jpeg",

        "image/png",

        "image/webp",

        "application/pdf"
    ]);


    if (
        !allowedTypes.has(
            mimeType
                .toLowerCase()
                .trim()
        )
    ) {

        return validationError(
            "file",
            "O comprovativo deve ser JPG, PNG, WEBP ou PDF."
        );
    }


    return null;
}


/*
============================================================
MONGODB OBJECT ID
============================================================
*/

export function validateObjectId(
    value,
    field = "id"
) {

    if (
        typeof value !==
        "string"
    ) {

        return validationError(
            field,
            `${field} inválido.`
        );
    }


    if (
        !/^[a-fA-F0-9]{24}$/.test(
            value
        )
    ) {

        return validationError(
            field,
            `${field} inválido.`
        );
    }


    return null;
}


/*
============================================================
PAGINATION
============================================================
*/

export function validatePagination(
    page,
    limit
) {

    let normalizedPage =
        Number(
            page
        );


    let normalizedLimit =
        Number(
            limit
        );


    if (
        !Number.isInteger(
            normalizedPage
        ) ||
        normalizedPage < 1
    ) {

        normalizedPage =
            1;
    }


    if (
        !Number.isInteger(
            normalizedLimit
        ) ||
        normalizedLimit < 1
    ) {

        normalizedLimit =
            20;
    }


    /*
    --------------------------------------------------------
    Nunca permitimos que o cliente peça milhares de registros
    numa única request.
    --------------------------------------------------------
    */

    normalizedLimit =
        Math.min(
            normalizedLimit,
            100
        );


    return {

        page:
            normalizedPage,

        limit:
            normalizedLimit,

        skip:
            (
                normalizedPage -
                1
            ) *
            normalizedLimit
    };
}


/*
============================================================
REGISTER VALIDATION
============================================================*/

export function validateRegistrationInput(
    input = {}
) {

    const errors = [];


    const nameError =
        validateName(
            input.name,
            "name"
        );


    if (
        nameError
    ) {

        errors.push(
            nameError
        );
    }


    const businessNameError =
        validateBusinessName(
            input.businessName
        );


    if (
        businessNameError
    ) {

        errors.push(
            businessNameError
        );
    }


    const emailError =
        validateEmail(
            input.email
        );


    if (
        emailError
    ) {

        errors.push(
            emailError
        );
    }


    const phoneError =
        validatePhone(
            input.phone,
            true
        );


    if (
        phoneError
    ) {

        errors.push(
            phoneError
        );
    }


    if (
        typeof input.password !==
        "string"
    ) {

        errors.push(
            validationError(
                "password",
                "Password é obrigatória."
            )
        );

    }

    else if (
        input.password.length <
        8
    ) {

        errors.push(
            validationError(
                "password",
                "Password deve possuir pelo menos 8 caracteres."
            )
        );
    }

    else if (
        input.password.length >
        128
    ) {

        errors.push(
            validationError(
                "password",
                "Password demasiado longa."
            )
        );
    }


    return errors;
}


/*
============================================================
LOGIN VALIDATION
============================================================
*/

export function validateLoginInput(
    input = {}
) {

    const errors = [];


    const emailError =
        validateEmail(
            input.email
        );


    if (
        emailError
    ) {

        errors.push(
            emailError
        );
    }


    if (
        typeof input.password !==
        "string" ||
        input.password.length ===
        0
    ) {

        errors.push(
            validationError(
                "password",
                "Password é obrigatória."
            )
        );
    }


    return errors;
}


/*
============================================================
BANK ACCOUNT VALIDATION
============================================================
*/

export function validateBankAccountInput(
    input = {}
) {

    const errors = [];


    const bankNameError =
        validateBankName(
            input.bankName
        );


    if (
        bankNameError
    ) {

        errors.push(
            bankNameError
        );
    }


    const accountNameError =
        validateAccountName(
            input.accountName
        );


    if (
        accountNameError
    ) {

        errors.push(
            accountNameError
        );
    }


    const ibanError =
        validateIban(
            input.iban
        );


    if (
        ibanError
    ) {

        errors.push(
            ibanError
        );
    }


    const accountType =
        input.accountType ||
        "bank";


    const allowedAccountTypes =
        new Set([
            "bank",
            "mobile_money",
            "other"
        ]);


    if (
        !allowedAccountTypes.has(
            accountType
        )
    ) {

        errors.push(
            validationError(
                "accountType",
                "Tipo de conta inválido."
            )
        );
    }


    return errors;
}


/*
============================================================
INVOICE VALIDATION
============================================================
*/

export function validateInvoiceInput(
    input = {}
) {

    const errors = [];


    const descriptionError =
        validateDescription(
            input.description,
            true
        );


    if (
        descriptionError
    ) {

        errors.push(
            descriptionError
        );
    }


    const amountError =
        validateAmount(
            input.amount
        );


    if (
        amountError
    ) {

        errors.push(
            amountError
        );
    }


    if (
        input.customerName !==
        undefined
    ) {

        const customerNameError =
            validateName(
                input.customerName,
                "customerName"
            );


        if (
            customerNameError
        ) {

            errors.push(
                customerNameError
            );
        }
    }


    if (
        input.customerPhone !==
        undefined
    ) {

        const customerPhoneError =
            validatePhone(
                input.customerPhone,
                false
            );


        if (
            customerPhoneError
        ) {

            errors.push(
                customerPhoneError
            );
        }
    }


    if (
        input.customerEmail !==
        undefined &&
        input.customerEmail !==
        ""
    ) {

        const customerEmailError =
            validateEmail(
                input.customerEmail
            );


        if (
            customerEmailError
        ) {

            errors.push(
                customerEmailError
            );
        }
    }


    return errors;
}


/*
============================================================
SANITIZED REGISTRATION DATA
============================================================
*/

export function sanitizeRegistrationInput(
    input = {}
) {

    return {

        name:
            sanitizeString(
                input.name,
                {
                    maxLength:
                        MAX_NAME_LENGTH
                }
            ),

        businessName:
            sanitizeString(
                input.businessName,
                {
                    maxLength:
                        MAX_BUSINESS_NAME_LENGTH
                }
            ),

        email:
            normalizeEmail(
                input.email
            ),

        phone:
            normalizePhone(
                input.phone
            ),

        password:
            typeof input.password ===
            "string"
                ? input.password
                : ""
    };
}


/*
============================================================
SANITIZED BANK ACCOUNT
============================================================
*/

export function sanitizeBankAccountInput(
    input = {}
) {

    return {

        bankName:
            sanitizeString(
                input.bankName,
                {
                    maxLength:
                        120
                }
            ),

        accountName:
            sanitizeString(
                input.accountName,
                {
                    maxLength:
                        150
                }
            ),

        iban:
            normalizeIban(
                input.iban
            ),

        accountType:
            input.accountType ||
            "bank"
    };
}


/*
============================================================
SANITIZED INVOICE
============================================================
*/

export function sanitizeInvoiceInput(
    input = {}
) {

    return {

        description:
            sanitizeString(
                input.description,
                {
                    maxLength:
                        MAX_DESCRIPTION_LENGTH
                }
            ),

        amount:
            parseAmountKz(
                input.amount
            ),

        customerName:
            input.customerName
                ? sanitizeString(
                    input.customerName,
                    {
                        maxLength:
                            MAX_NAME_LENGTH
                    }
                )
                : "",

        customerPhone:
            input.customerPhone
                ? normalizePhone(
                    input.customerPhone
                )
                : "",

        customerEmail:
            input.customerEmail
                ? normalizeEmail(
                    input.customerEmail
                )
                : ""
    };
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    validationError,

    validateRequiredString,

    validateName,

    validateBusinessName,

    validateEmail,

    validatePhone,

    validateIban,

    validateSlug,

    validateDescription,

    validateAmount,

    validateBankName,

    validateAccountName,

    validateReceiptMimeType,

    validateObjectId,

    validatePagination,

    validateRegistrationInput,

    validateLoginInput,

    validateBankAccountInput,

    validateInvoiceInput,

    sanitizeRegistrationInput,

    sanitizeBankAccountInput,

    sanitizeInvoiceInput
};
