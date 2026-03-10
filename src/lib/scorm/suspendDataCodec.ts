/**
 * Suspend Data Codec
 *
 * SCORM suspend_data often has strict character and size limitations.
 * Some LMS implementations also behave poorly with certain JSON characters.
 *
 * This lightweight codec stores JSON using safe replacement characters
 * to reduce issues with LMS parsing and encoding.
 *
 * Replacements:
 *   "  → ~
 *   ,  → |
 *   '  → ¬
 *
 * The encoded string can then be safely stored in cmi.suspend_data.
 * decodeSuspendData restores the original JSON before parsing.
 */

export function encodeSuspendData(data: object): string {
    return JSON.stringify(data).replace(/[']/g, "¬").replace(/["]+/g, "~").replace(/[,]/g, "|");
}

export function decodeSuspendData(str: string): unknown {
    return JSON.parse(str.replace(/~/g, `"`).replace(/[|]/g, ",").replace(/¬/g, "'"));
}
