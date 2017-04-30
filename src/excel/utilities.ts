/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { APIError } from '../errors/custom.error';

/**
 * Helper exposing useful Utilities for Excel Add-ins.
 */
export class ExcelUtilities {
    /**
     * Utility to create (or re-create) a worksheet, even if it already exists.
     * @returns the new worksheet
     */
    static async forceCreateSheet(
        workbook: Excel.Workbook,
        sheetName: string,
        options?: {
            /**
             * clearOnly: If the sheet already exists, keep it as is, and only clear its grid.
             * This results in a faster operation, and avoid a screen-update flash
             * (and the re-setting of the current selection).
             * Note that clearing the grid does not remove floating objects like charts,
             * so it's more of a "soft" operation, rather than a complete
             * forceful re-creation of a sheet.
             */
            clearOnly?: true
        }
    ): Promise<Excel.Worksheet> {
        if (workbook == null && typeof workbook !== typeof Excel.Workbook) {
            throw new APIError('Invalid workbook parameter.');
        }

        if (sheetName == null || sheetName.trim() === '') {
            throw new APIError('Sheet name cannot be blank.');
        }

        if (sheetName.length > 31) {
            throw new APIError('Sheet name cannot be greater than 31 characters.');
        }

        options = options || {};
        const context: Excel.RequestContext = <any>workbook.context;

        if (options.clearOnly) {
            return createOrClear();
        } else {
            return recreateFromScratch();
        }


        // Helpers

        async function createOrClear(): Promise<Excel.Worksheet> {
            if (Office.context.requirements.isSetSupported('ExcelApi', 1.4)) {
                const existingSheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
                await context.sync();

                if (existingSheet.isNullObject) {
                    return context.workbook.worksheets.add(sheetName);
                } else {
                    existingSheet.getRange().clear();
                    return existingSheet;
                }
            }
            else {
                // Flush anything already in the queue, so as to scope the error handling logic below.
                await context.sync();

                try {
                    const oldSheet = workbook.worksheets.getItem(sheetName);
                    oldSheet.getRange().clear();
                    await context.sync();
                    return oldSheet;
                }
                catch (error) {
                    if (error instanceof OfficeExtension.Error && error.code === Excel.ErrorCodes.itemNotFound) {
                        // This is an expected case where the sheet didn't exist. Create it now.
                        return workbook.worksheets.add(sheetName);
                    }
                    else {
                        throw new APIError('Unexpected error while trying to delete sheet.', error);
                    }
                }
            }
        }

        async function recreateFromScratch(): Promise<Excel.Worksheet> {
            const newSheet = workbook.worksheets.add();

            if (Office.context.requirements.isSetSupported('ExcelApi', 1.4)) {
                context.workbook.worksheets.getItemOrNullObject(sheetName).delete();
            }
            else {
                // Flush anything already in the queue, so as to scope the error handling logic below.
                await context.sync();

                try {
                    const oldSheet = workbook.worksheets.getItem(sheetName);
                    oldSheet.delete();
                    await context.sync();
                }
                catch (error) {
                    if (error instanceof OfficeExtension.Error && error.code === Excel.ErrorCodes.itemNotFound) {
                        // This is an expected case where the sheet didn't exist. Hence no-op.
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
}
