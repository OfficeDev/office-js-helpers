/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information. */

import { APIError } from '../errors/api';

/**
 * Helper exposing useful Utilities for Excel-Addins.
 */
class ExcelUtilities {
    /**
     * Utility to delete a worksheet if it already exists.
     * @returns true if the sheet had existed before being deleted.
     */
    static async deleteSheetIfExists(sheetName: string): Promise<boolean> {
        if (sheetName === '') {
            throw new APIError('Sheet name cannot be blank.');
        }

        // For compatibility with ExcelApi 1.1, using a throwing-behavior check to determine whether the item exists and delete it.
        // In ExcelApi 1.4, this code could instead have been in-lined into the caller by simply doing:
        // context.workbook.worksheets.getItemOrNullObject(sheetName).delete()
        try {
            return await Excel.run(async context => {
                const sheet = context.workbook.worksheets.getItem(sheetName);
                sheet.delete();
                await context.sync();
                return true;
            });
        }
        catch (error) {
            if (error instanceof OfficeExtension.Error && error.code === Excel.ErrorCodes.itemNotFound) {
                return false;
            }

            throw new APIError('Unexpected error while trying to delete sheet.', error);
        }
    }
}

export { ExcelUtilities as Excel };
