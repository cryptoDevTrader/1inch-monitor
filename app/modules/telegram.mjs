'use strict';

import API from './api';
import log from './logger';

class Telegram {
	constructor(botToken, defaultChatId) {
        this.api = new API(`https://api.telegram.org/bot${botToken}`)
        this.defaultChatId = defaultChatId;
    }

    sendNotification(params, cb) {
        if (!params.chat_id && !this.defaultChatId) {
            const error = 'No default chat id provided.';

            log.error(error);

            cb(null, error);

            return;
        }

        params.chat_id = this.defaultChatId;

        this.api.get('sendMessage', params, cb);
    }
}

export default Telegram;