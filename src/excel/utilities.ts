/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { APIError } from '../errors/api';

/**
 * Helper exposing useful Utilities for Excel-Addins.
 */
export class ExcelUtilities {
    /**
     * Utility to delete a worksheet if it already exists.
     * @returns true if the sheet had existed before being deleted.
     */
    static async forceCreateSheet(workbook: Excel.Workbook, sheetName: string): Promise<Excel.Worksheet> {
        if (workbook == null && typeof workbook !== typeof Excel.Workbook) {
            throw new APIError('Invalid workbook parameter.');
        }

        if (sheetName == null || sheetName.trim() === '') {
            throw new APIError('Sheet name cannot be blank.');
        }

        if (sheetName.length > 31) {
            throw new APIError('Sheet name cannot be greater than 31 characters.');
        }

        const { context } = workbook;
        const newSheet = workbook.worksheets.add();

        if (Office.context.requirements.isSetSupported('ExcelApi', 1.4)) {
            (context as any).workbook.worksheets.getItemOrNullObject(sheetName).delete();
        }
        else {
            /**
             * Flush anything already in the queue, so that the error,
             * so as to scope the error handling logic below.
             */
            await context.sync();

            try {
                const oldSheet = workbook.worksheets.getItem(sheetName);
                oldSheet.delete();
                await context.sync();
            }
            catch (error) {
                if (error instanceof OfficeExtension.Error && error.code === Excel.ErrorCodes.itemNotFound) {
                    /**
                     * This is an expected case where the sheet didnt exist. Hence no-op.
                     */
                }
                else {
                    throw new APIError('Unexpected error while trying to delete sheet.', error);
                }
            }
        }

        newSheet.name = sheetName;
        return newSheet;
    }
}
