/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { APIError } from '../errors/api.error';

/**
 * Helper exposing useful Utilities for Excel Add-ins.
 */
export class ExcelUtilities {
  /**
   * Utility to create (or re-create) a worksheet, even if it already exists.
   * @param workbook
   * @param sheetName
   * @param clearOnly If the sheet already exists, keep it as is, and only clear its grid.
   * This results in a faster operation, and avoid a screen-update flash
   * (and the re-setting of the current selection).
   * Note: Clearing the grid does not remove floating objects like charts.
   * @returns the new worksheet
   */
  static async forceCreateSheet(
    workbook: Excel.Workbook,
    sheetName: string,
    clearOnly?: boolean
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

    let sheet: Excel.Worksheet;
    if (clearOnly) {
      sheet = await createOrClear(workbook.context as any, workbook, sheetName);
    }
    else {
      sheet = await recreateFromScratch(workbook.context as any, workbook, sheetName);
    }

    // To work around an issue with Office Online (tracked by the API team), it is
    // currently necessary to do a `context.sync()` before any call to `sheet.activate()`.
    // So to be safe, in case the caller of this helper method decides to immediately
    // turn around and call `sheet.activate()`, call `sync` before returning the sheet.
    await workbook.context.sync();

    return sheet;
  }
}

/**
 * Helpers
 */
async function createOrClear(
  context: Excel.RequestContext,
  workbook: Excel.Workbook,
  sheetName: string
): Promise<Excel.Worksheet> {
  if (Office.context.requirements.isSetSupported('ExcelApi', 1.4)) {
    const existingSheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
    await context.sync();

    if (existingSheet.isNullObject) {
      return context.workbook.worksheets.add(sheetName);
    }
    else {
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

async function recreateFromScratch(
  context: Excel.RequestContext,
  workbook: Excel.Workbook,
  sheetName: string
): Promise<Excel.Worksheet> {
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
