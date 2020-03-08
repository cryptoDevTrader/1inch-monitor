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

const getQuote = (params) => new Promise((resolve, reject) => {
	oneInch.getQuote(params, (body, error) => {
		if (error) {
			log.error(`Error getting quote: ${error}`);
			reject(error);
			return;
		}

		resolve(body.toTokenAmount);
	});
});

const checkNext = async () => {
	const rule = rules[i];

	log.info(`Checking if ${rule.rule}`);

	const tokens = rule.tokenPath;
	let amount = rule.fromTokenAmount;

	for (let i = 0; i < tokens.length - 1; i++) {
		const fromAmount = amount;
		const fromTokenSymbol = tokens[i];
		const toTokenSymbol = tokens[i+1];

		amount = await getQuote({
			fromTokenSymbol: fromTokenSymbol,
			toTokenSymbol: toTokenSymbol,
			amount: fromAmount,
			disableExchangeList: rule.disableExchangeList
		});

		log.debug(`${fromAmount} ${fromTokenSymbol} = ${amount} ${toTokenSymbol}`);
	}

	const rate = amount / rule.fromTokenAmount;
	const message = `${rule.fromTokenAmount} ${tokens.join('-')} = ${amount} (${rate})`;

	log.debug(message);

	if (eval(`${amount} ${rule.comparitor} ${rule.toTokenAmount}`)) {
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
};

checkNext();

exitHook(() => {
	clearTimeout(timeout);
});