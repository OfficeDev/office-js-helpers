// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

/**
 * Helper exposing useful Utilities for Excel-Addins.
 */
export class Utilities {
    /**
     * Utility to delete a worksheet if it already exists.
     * @returns true if the sheet had existed before being deleted.
     */
    static deleteSheetIfExists(sheetName : string): OfficeExtension.Promise<boolean> {
        if (sheetName == "") {
            throw new Error("Sheet name cannot be blank.");
        }

        // For compatibility with ExcelApi 1.1, using a throwing-behavior check to determine whether the item exists and delete it.
        // In ExcelApi 1.4, this code could instead have been in-lined into the caller by simply doing:
        // context.workbook.worksheets.getItemOrNullObject(sheetName).delete()

        return Excel.run(context => {
            const sheet = context.workbook.worksheets.getItem(sheetName);
            sheet.delete();
            return context.sync().then(() => {
                // Sheet was found and was able to be deleted
                return true;
            });
        })
        .catch(error => {
            if (error instanceof OfficeExtension.Error && error.code === Excel.ErrorCodes.itemNotFound) {
                return false;
            }

            // Otherwise, re-throw the error:
            throw error;
        });
    }
}