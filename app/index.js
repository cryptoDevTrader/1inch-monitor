'use strict';

import log from './modules/logger';
import requireEnvs from './modules/require-envs';
import Telegram from './modules/telegram';
import OneInch from './modules/1inch';
import RulesParser from './modules/rules-parser';
import exitHook from 'exit-hook';

requireEnvs('TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RULES');

const interval = (parseInt(process.env.INTERVAL_SECONDS) || 10) * 1000,
	  maxInFlight = parseInt(process.env.MAX_INFLIGHT) || 3,
	  oneInch = new OneInch(process.env.API_VERSION || 'v1.1', maxInFlight, true),
	  telegram = new Telegram(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID),
	  rulesParser = new RulesParser(),
	  rules = rulesParser.parse(process.env.RULES);

let timeout;

const getQuote = (params) => new Promise((resolve, reject) => {
	oneInch.getQuote(params, (body, error) => {
		if (error) {
			reject(error);
			return;
		}

		resolve(body.toTokenAmount);
	});
});

const getMultiPathQuote = (rule) => new Promise(async (resolve, reject) => {
	log.debug(`Checking if ${rule.rule}`);

	const tokens = rule.tokenPath;
	let amount = rule.fromTokenAmount;
	let quoteError;

	for (let i = 0; i < tokens.length - 1; i++) {
		const fromAmount = amount;
		const fromTokenSymbol = tokens[i];
		const toTokenSymbol = tokens[i+1];

		amount = await getQuote({
			fromTokenSymbol: fromTokenSymbol,
			toTokenSymbol: toTokenSymbol,
			amount: fromAmount,
			disableExchangeList: rule.disableExchangeList
		}).catch((error) => {
			quoteError = `Error getting ${fromTokenSymbol}-${toTokenSymbol} quote: ${error}`;
		});

		if (quoteError) {
			break;
		}

		log.debug(`${fromAmount} ${fromTokenSymbol} = ${amount} ${toTokenSymbol}`);
	}

	if (quoteError) {
		reject(quoteError);
		return;
	}

	const rate = amount / rule.fromTokenAmount;
	const message = `${rule.fromTokenAmount} ${tokens.join('-')} = ${amount} (${rate})`;

	log.info(message);

	if (eval(`${amount} ${rule.comparitor} ${rule.toTokenAmount}`)) {
		if (!rule.alerted) {
			telegram.sendNotification({
				text: message
			}, (body, error) => {
				if (error != null) {
					reject(`Error sending notification: ${error}`);
					return;
				}

				rule.alerted = true;
				resolve();
			});
		}
	} else {
		rule.alerted = false;
		resolve();
	}
});

const checkAll = async (body, error) => {
	if (error) {
		getTokensFirst();
		return;
	}

	const quotes = rules.map((rule) => {
		return getMultiPathQuote(rule).catch((error) => {
			log.error(error);
		});
	});

	Promise.all(quotes).finally(() => {
		timeout = setTimeout(checkAll, interval);
	});
};

const getTokensFirst = () => {
	oneInch.getTokens(checkAll);
};

log.debug('Getting tokens');
getTokensFirst();

exitHook(() => {
	clearTimeout(timeout);
});