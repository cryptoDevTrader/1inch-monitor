'use strict';

const https = require("https"),
	  log = require('./logger'),
	  exitHook = require('exit-hook'),
	  querystring = require('querystring');

const requiredEnvs = [
	'TELEGRAM_BOT_TOKEN',
	'TELEGRAM_CHAT_ID'
];

const missingEnv = requiredEnvs.some((env) => {
	if (process.env[env] === undefined) {
		log.error('Missing required env variable: %s', env);
		return true;
	}
});

if (missingEnv) {
	return;
}

const regex = /^([0-9]*\.?[0-9]+)\s([A-Z]+)\s(>?<?=?)\s([0-9]*\.?[0-9]+)\s([A-Z]+)(?:\s!)?(.*)$/;
const rules = process.env.RULES.split("\n").map(rule => {
	const m = regex.exec(rule);

	if (m.length < 6 || m.length > 7) {
		log.error(`Rule not recognized: ${rule}`);
		return null;
	}

	return {
		rule: rule,
		fromTokenAmount: m[1],
		fromTokenSymbol: m[2],
		comparitor: m[3],
		toTokenAmount: m[4],
		toTokenSymbol: m[5],
		disableExchangeList: m[6]
	};
}).filter(r => !!r);

const interval = (parseInt(process.env.INTERVAL_SECONDS) || 1) * 1000;
const api_version = process.env.API_VERSION || 'v1.1';
const telegram_bot_url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${process.env.TELEGRAM_CHAT_ID}&text=`;
const quote_url = `https://api.1inch.exchange/${api_version}/quote`;
const tokens_url = `https://api.1inch.exchange/${api_version}/tokens`;

const sendNotification = (text, cb) => {
	log.info(text);

	https.get(telegram_bot_url + text, (res) => {
		const chunks = [];

		res.on("data", (chunk) => {
			chunks.push(chunk);
		});

		res.on("end", () => {
			const body = Buffer.concat(chunks);

			if (cb != null) {
				cb(JSON.parse(body));
			}
		});
	}).on('error', (e) => {
		log.error(e);

		if (cb != null) {
			cb(null, e);
		}
	});
};

const checkPrice = (fromTokenSymbol, toTokenSymbol, amount, disableExchangeList, cb) => {
	const params = {
		fromTokenSymbol: fromTokenSymbol,
		toTokenSymbol: toTokenSymbol,
		amount: amount,
		disableExchangeList: disableExchangeList,
		cb: new Date().getTime()
	};

	const url = quote_url + '?' + querystring.stringify(params);

	log.http(url);

	https.get(url, (res) => {
		const chunks = [];

		res.on("data", (chunk) => {
			chunks.push(chunk);
		});

		res.on("end", () => {
			const body = Buffer.concat(chunks);

			log.http(body.toString());

			if (cb != null) {
				cb(JSON.parse(body));
			}
		});
	}).on('error', (e) => {
		log.error(e);

		if (cb != null) {
			cb(null, e);
		}
	});
};

const getTokens = (cb) => {
	https.get(tokens_url, (res) => {
		const chunks = [];

		res.on("data", (chunk) => {
			chunks.push(chunk);
		});

		res.on("end", () => {
			const body = Buffer.concat(chunks);

			log.http(body.toString());

			if (cb != null) {
				cb(JSON.parse(body));
			}
		});
	}).on('error', (e) => {
		log.error(e);

		if (cb != null) {
			cb(null, e);
		}
	});
};

const checkRules = (tokens) => {
	// Ensure that "alerted" is set to false for all configs
	rules.forEach(rule => {
		rule.alerted = false;
	});

	let timeout;
	let i = 0;

	const checkNext = () => {
		const rule = rules[i];
	
		[rule.fromTokenSymbol, rule.toTokenSymbol].forEach(symbol => {
			if (!tokens.hasOwnProperty(symbol)) {
				log.error(`Unknown token: ${symbol}`);
				return;
			}	
		});

		const fromTokenAmount = (rule.fromTokenAmount * parseFloat(`${10}e${tokens[rule.fromTokenSymbol].decimals}`)).toLocaleString('fullwide', {useGrouping: false});

		log.info(`Checking if ${rule.rule}`);

		checkPrice(rule.fromTokenSymbol, rule.toTokenSymbol, fromTokenAmount, rule.disableExchangeList, (body, error) => {
			if (error != null) {
				return;
			}

			const toAmount = body.toTokenAmount / parseFloat(`${10}e${tokens[rule.toTokenSymbol].decimals}`);
			const rate = toAmount / rule.fromTokenAmount;

			const message = `${rule.fromTokenAmount} ${rule.fromTokenSymbol} = ${toAmount} ${rule.toTokenSymbol} (${rate})`;

			log.debug(message);

			if (eval(`${toAmount} ${rule.comparitor} ${rule.toTokenAmount}`)) {
				if (!rule.alerted) {
					sendNotification(message, (body, error) => {
						if (error != null) {
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
	}

	checkNext();

	exitHook(() => {
		clearTimeout(timeout);
	});
};

getTokens((body, error) => {
	if (error != null) {
		return;
	}

	checkRules(body);
});