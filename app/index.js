'use strict';

import log from './modules/logger';
import requireEnvs from './modules/require-envs';
import Telegram from './modules/telegram';
import OneInch from './modules/1inch';
import RulesParser from './modules/rules-parser';
import exitHook from 'exit-hook';

requireEnvs('TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RULES');

const interval = (parseInt(process.env.INTERVAL_SECONDS) || 1) * 1000,
	  oneInch = new OneInch(process.env.API_VERSION || 'v1.1', true),
	  telegram = new Telegram(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID),
	  rulesParser = new RulesParser(),
	  rules = rulesParser.parse(process.env.RULES);

let timeout,
	i = 0;

const checkNext = () => {
	const rule = rules[i];

	log.info(`Checking if ${rule.rule}`);

	oneInch.getQuote({
		fromTokenSymbol: rule.fromTokenSymbol,
		toTokenSymbol: rule.toTokenSymbol,
		amount: rule.fromTokenAmount,
		disableExchangeList: rule.disableExchangeList,
		cb: new Date().getTime() // cache buster
	}, (body, error) => {
		if (error != null) {
			log.error(`Error getting quote: ${error}`);
			return;
		}

		const rate = body.toTokenAmount / rule.fromTokenAmount;

		const message = `${rule.fromTokenAmount} ${rule.fromTokenSymbol} = ${body.toTokenAmount} ${rule.toTokenSymbol} (${rate})`;

		log.debug(message);

		if (eval(`${body.toTokenAmount} ${rule.comparitor} ${rule.toTokenAmount}`)) {
			if (!rule.alerted) {
				telegram.sendNotification({
					text: message
				}, (body, error) => {
					if (error != null) {
						log.error(`Error sending notification: ${error}`);
						return;
					}

					rule.alerted = true;
				});
			}
		} else {
			rule.alerted = false;
		}

		if (i >= rules.length - 1) {
			i = 0;
		}
		else {
			i++;
		}

		timeout = setTimeout(checkNext, interval);
	});
};

checkNext();

exitHook(() => {
	clearTimeout(timeout);
});