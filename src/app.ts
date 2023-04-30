import fs from 'fs';
import path from "path";
import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { Currency } from "./models/currency";
import { CurrencyService } from "./services/currency-service";
import { ExchangeRateService } from "./services/exchange-rate-service";
import { UserService } from "./services/user-service";
import moment from "moment";
import swaggerUi from "swagger-ui-express";

const app = express();
const port = 3000;

const apiUrl: string = "/api/v1";

const userService = new UserService();
const currencyService = new CurrencyService();
const exchangeRateService = new ExchangeRateService(currencyService);

const swaggerSpec = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8')) as object;

app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.urlencoded({ extended: false }));
app.use(
	session({
		secret: "some_secret",
		resave: false,
		saveUninitialized: false,
	})
);
app.use(cookieParser());
app.use(express.json());

function isTokenValid(token: string | undefined) {
	return token && userService.isTokenValid(token);
}

function checkAuthenticated(req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;

	if (authHeader && authHeader.startsWith("Bearer ")) {
		const token = authHeader.substring(7);

		if (isTokenValid(token)) {
			return next();
		}
	}

	res.status(401).send();
}

function checkNotAuthenticated(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return next();
	}

	const token = authHeader.substring(7);
	if (!isTokenValid(token)) {
		return next();
	}

	res.status(200).send();
}

app.post(apiUrl + "/login", checkNotAuthenticated, (req, res) => {
	let email = req.body.email;
	let password = req.body.password;

	let user = userService.getUserByEmailAndPassword(email, password);
	if (!user) {
		res.status(401).send("Invalid email or password");
		return;
	}

	let token = userService.login(email, password);
	res.setHeader("Authorization", "Bearer " + token);

	res.status(200).send();
});

app.get(apiUrl + "/logout", (req, res) => {
	res.setHeader("Authorization", "");

	res.status(200).send();
});

app.get(apiUrl + "/currencies", (req, res) => {
	let currencies = currencyService.getCurrencies();

	res.status(200).send(currencies);
});

app.get(apiUrl + "/currencies/:id/history", (req, res) => {
	const currentDate = moment().toDate();
	const tomorrowDate = moment().add(1, "days").toDate();

	const currentDateOnly = new Date(
		currentDate.getFullYear(),
		currentDate.getMonth(),
		currentDate.getDate()
	);
	const tomorrowDateOnly = new Date(
		tomorrowDate.getFullYear(),
		tomorrowDate.getMonth(),
		tomorrowDate.getDate()
	);

	const currencyId = parseInt(req.params.id);
	const fromDate = req.query.fromDate
		? new Date(<string>req.query.fromDate)
		: currentDateOnly;
	const toDate = req.query.toDate
		? new Date(<string>req.query.toDate)
		: tomorrowDateOnly;

	const exchangeRates =
		exchangeRateService.getExchangeRatesForCurrencyOnDates(
			currencyId,
			fromDate,
			toDate
		);

	const response = exchangeRates.map((rate) => {
		return {
			id: rate.id,
			fromCurrency: rate.fromCurrency,
			toCurrency: rate.toCurrency,
			date: moment(rate.date).utc(true),
			rate: rate.rate,
		};
	});

	res.status(200).send(response);
});

app.post(apiUrl + "/currencies", checkAuthenticated, (req, res) => {
	let name: string = req.body.name;

	try {
		currencyService.addCurrency(name);
	} catch (e) {
		res.status(400).send((<Error>e).message);
		return;
	}

	res.status(201).send();
});

app.put(apiUrl + "/currencies/edit/:id", checkAuthenticated, (req, res) => {
	let currencyToUpdate = new Currency(parseInt(req.params.id), req.body.name);

	try {
		currencyService.updateCurrency(currencyToUpdate);
	} catch (e) {
		res.status(400).send((<Error>e).message);
		return;
	}

	res.status(200).send();
});

app.delete(
	apiUrl + "/currencies/delete/:id",
	checkAuthenticated,
	(req, res) => {
		let id = parseInt(req.params.id);

		try {
			currencyService.deleteCurrencyById(id);
		} catch (e) {
			res.status(400).send((<Error>e).message);
			return;
		}

		res.status(200).send();
	}
);

app.get(apiUrl + "/exchange-rates", (req, res) => {
	let exchangeRates = exchangeRateService.getExchangeRatesOnDay(new Date());

	res.status(200).send(exchangeRates);
});

app.post(apiUrl + "/exchange-rates", checkAuthenticated, (req, res) => {
	let date = new Date(req.body.date);
	let fromCurrencyId = req.body.fromCurrency;
	let toCurrencyId = req.body.toCurrency;
	let rate = parseFloat(req.body.rate);

	try {
		exchangeRateService.addExchangeRate(
			date,
			fromCurrencyId,
			toCurrencyId,
			rate
		);
	} catch (e) {
		res.status(400).send((<Error>e).message);
		return;
	}

	res.status(201).send();
});

app.put(apiUrl + "/exchange-rate/edit/:id", checkAuthenticated, (req, res) => {
	let id = parseInt(req.params.id);
	let rate = parseFloat(req.body.rate);

	try {
		exchangeRateService.updateExchangeRate(id, rate);
	} catch (e) {
		res.status(400).send((<Error>e).message);
		return;
	}

	res.status(200).send();
});

app.delete(
	apiUrl + "/exchange-rates/delete/:id",
	checkAuthenticated,
	(req, res) => {
		let id = parseInt(req.params.id);

		try {
			exchangeRateService.deleteExchangeRateById(id);
		} catch (e) {
			res.status(400).send((<Error>e).message);
			return;
		}

		res.status(200).send();
	}
);

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
