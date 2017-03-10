/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information. */
import { APIError } from '../errors/api';

/**
 * Helper exposing useful Utilities for Excel-Addins.
 */
export class ExcelUtilities {
    /**
     * Utility to delete a worksheet if it already exists.
     * @returns true if the sheet had existed before being deleted.
     */
    static async forceCreateSheet(worksheets: Excel.WorksheetCollection, sheetName: string): Promise<Excel.Worksheet> {
        if (sheetName == null || sheetName.trim() === '') {
            throw new APIError('Sheet name cannot be blank.');
        }

        const { context } = worksheets;
        const newSheet = (context as Excel.RequestContext).workbook.worksheets.add();

        if (Office.context.requirements.isSetSupported('ExcelApi', 1.4)) {
            (context as any).workbook.worksheets.getItemOrNullObject(sheetName).delete();
        }
        else {
            // For compatibility with ExcelApi 1.1, using a throwing-behavior check to determine whether the item exists and delete it.
            // In ExcelApi 1.4, this code could instead have been in-lined into the caller by simply doing:
            // context.workbook.worksheets.getItemOrNullObject(sheetName).delete()
            await context.sync();
            try {
                const oldSheet = (context as Excel.RequestContext).workbook.worksheets.getItem(sheetName);
                oldSheet.delete();
                await context.sync();
            }
            catch (error) {
                if (error instanceof OfficeExtension.Error && error.code === Excel.ErrorCodes.itemNotFound) {
                    return null;
                }

                throw new APIError('Unexpected error while trying to delete sheet.', error);
            }
        }

        newSheet.name = sheetName;
        return newSheet;
    }
}
