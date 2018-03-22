/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { Utilities, PlatformType } from '../helpers/utilities';
import html from './message-banner.html';

const DEFAULT_WHITESPACE = 2;

export interface IMessageBannerParams {
  title?: string;
  message?: string;
  type: 'default' | 'success' | 'error' | 'warning' | 'severe-warning';
  details?: string;
}

export class UI {
  /** Shows a basic notification at the top of the page
    * @param message - body of the notification
    */
  static notify(message: string);

  /** Shows a basic notification with a custom title at the top of the page
   * @param message - body of the notification
   * @param title - title of the notification
   */
  static notify(message: string, title: string);

  /** Shows a basic notification at the top of the page, with a background color set based on the type parameter
   * @param message - body of the notification
   * @param title - title of the notification
   * @param type - type of the notification - see https://dev.office.com/fabric-js/Components/MessageBar/MessageBar.html#Variants
   */
  static notify(message: string, title: string, type: 'default' | 'success' | 'error' | 'warning' | 'severe-warning');

  /** Shows a basic error notification at the top of the page
   * @param error - Error object
   */
  static notify(error: Error);

  /** Shows a basic error notification with a custom title at the top of the page
   * @param title - Title, bolded
   * @param error - Error object
   */
  static notify(error: Error, title: string);

  static notify(...args: any[]) {
    const params = _parseNotificationParams(args);
    if (params == null) {
      console.error(new Error('Invalid params. Cannot create a notification'));
      return null;
    }

    const messageBarClasses = {
      'success': 'ms-MessageBar--success',
      'error': 'ms-MessageBar--error',
      'warning': 'ms-MessageBar--warning',
      'severe-warning': 'ms-MessageBar--severeWarning'
    };

    const messageBarTypeClass = messageBarClasses[params.type] || '';

    let paddingForPersonalityMenu = '0';
    if (Utilities.platform === PlatformType.PC) {
      paddingForPersonalityMenu = '20px';
    }
    else if (Utilities.platform === PlatformType.MAC) {
      paddingForPersonalityMenu = '40px';
    }

    const messageBannerHtml = html.replace('@@CLASS', messageBarTypeClass).replace('\'@@PADDING\'', paddingForPersonalityMenu);

    const existingNotifications = document.getElementsByClassName('office-js-helpers-notification');
    while (existingNotifications[0]) {
      existingNotifications[0].parentNode.removeChild(existingNotifications[0]);
    }

    document.body.insertAdjacentHTML('afterbegin', messageBannerHtml);

    const notificationDiv = document.getElementsByClassName('office-js-helpers-notification')[0];
    const messageTextArea = document.createElement('div');
    notificationDiv.insertAdjacentElement('beforeend', messageTextArea);

    if (params.title) {
      const titleDiv = document.createElement('div');
      titleDiv.textContent = params.title;
      titleDiv.classList.add('ms-fontWeight-semibold');
      messageTextArea.insertAdjacentElement('beforeend', titleDiv);
    }

    params.message.split('\n').forEach(text => {
      const div = document.createElement('div');
      div.textContent = text;
      messageTextArea.insertAdjacentElement('beforeend', div);
    });

    if (params.details) {
      const labelDiv = document.createElement('div');
      messageTextArea.insertAdjacentElement('beforeend', labelDiv);
      const label = document.createElement('a');
      label.setAttribute('href', 'javascript:void(0)');
      label.onclick = () => {
        (document.querySelector('.office-js-helpers-notification pre') as HTMLPreElement)
          .parentElement.style.display = 'block';
        labelDiv.style.display = 'none';
      };
      label.textContent = 'Details';
      labelDiv.insertAdjacentElement('beforeend', label);

      const preDiv = document.createElement('div');
      preDiv.style.display = 'none';
      messageTextArea.insertAdjacentElement('beforeend', preDiv);
      const detailsDiv = document.createElement('pre');
      detailsDiv.textContent = params.details;
      preDiv.insertAdjacentElement('beforeend', detailsDiv);
    }

    (document.querySelector('.office-js-helpers-notification > button') as HTMLButtonElement)
      .onclick = () => notificationDiv.parentNode.removeChild(notificationDiv);
  }
}

export function _parseNotificationParams(params: any[]): IMessageBannerParams {
  if (params == null) {
    return null;
  }

  const [body, title, type] = params;
  if (body instanceof Error) {
    let details = '';
    const { innerError, stack } = body as any;
    if (innerError) {
      let error = JSON.stringify(innerError.debugInfo || innerError, null, DEFAULT_WHITESPACE);
      details += `Inner Error: \n${error}\n`;
    }
    if (stack) {
      details += `Stack Trace: \n${body.stack}\n`;
    }
    return {
      message: body.message,
      title: title || body.name,
      type: 'error',
      details: details
    };
  }
  else if (typeof body === 'string' || body instanceof String) {
    return {
      message: body.toString(),
      title,
      type: type || 'default',
      details: null
    };
  }
  else {
    return {
      type: 'default',
      details: JSON.stringify(body, null, DEFAULT_WHITESPACE)
    };
  }
}
