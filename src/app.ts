import fs from 'fs';
import path from "path";
import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import Currency from "./models/currency";
import { CurrencyService } from "./services/currency-service";
import { ExchangeRateService } from "./services/exchange-rate-service";
import { UserService } from "./services/user-service";
import moment from "moment";
import swaggerUi from "swagger-ui-express";
import { Sequelize } from 'sequelize-typescript';
import User from "./models/user";
import ExchangeRate from "./models/exchange-rate";

const app = express();
const port = 3000;

const apiUrl: string = "/api/v1";

const sequelize = new Sequelize({
	repositoryMode: true,
	host: "localhost",
	database: 'CurrencyExchange',
	dialect: 'mssql',
	username: 'idiordiev',
	password: 'vSMSooPOVGb29uaOt7Ik',
	models: [__dirname + '/models'],
	port: 55127,
	dialectOptions: {
		instanceName: "SQLEXPRESS",
		encrypt: true,
		port: 55127
	}
});

sequelize.sync();

const userRepository = sequelize.getRepository(User);
const currencyRepository = sequelize.getRepository(Currency);
const exchangeRateRepository = sequelize.getRepository(ExchangeRate);

const userService = new UserService(userRepository);
const currencyService = new CurrencyService(currencyRepository);
const exchangeRateService = new ExchangeRateService(exchangeRateRepository, currencyService);

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

app.post(apiUrl + "/login", checkNotAuthenticated, async (req, res) => {
	let email = req.body.email;
	let password = req.body.password;

	let user = await userService.getUserByEmailAndPassword(email, password);
	if (!user) {
		res.status(401).send("Invalid email or password");
		return;
	}

	let token = await userService.login(email, password);
	res.setHeader("Authorization", "Bearer " + token);

	res.status(200).send();
});

app.get(apiUrl + "/logout", (req, res) => {
	res.setHeader("Authorization", "");

	res.status(200).send();
});

app.get(apiUrl + "/currencies", async (req, res) => {
	let currencies = await currencyService.getCurrencies();

	res.status(200).send(currencies);
});

app.get(apiUrl + "/currencies/:id/history", async (req, res) => {
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
		await exchangeRateService.getExchangeRatesForCurrencyOnDates(
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

app.post(apiUrl + "/currencies", checkAuthenticated, async (req, res) => {
	let name: string = req.body.name;

	try {
		await currencyService.addCurrency(name);
	} catch (e) {
		res.status(400).send((<Error>e).message);
		return;
	}

	res.status(201).send();
});

app.put(apiUrl + "/currencies/edit/:id", checkAuthenticated, async (req, res) => {
	try {
		await currencyService.updateCurrency(parseInt(req.params.id), req.body.name);
	} catch (e) {
		res.status(400).send((<Error>e).message);
		return;
	}

	res.status(200).send();
});

app.delete(
	apiUrl + "/currencies/delete/:id",
	checkAuthenticated,
	async (req, res) => {
		let id = parseInt(req.params.id);

		try {
			await currencyService.deleteCurrencyById(id);
		} catch (e) {
			res.status(400).send((<Error>e).message);
			return;
		}

		res.status(200).send();
	}
);

app.get(apiUrl + "/exchange-rates", async (req, res) => {
	let exchangeRates = await exchangeRateService.getExchangeRatesOnDay(new Date());

	res.status(200).send(exchangeRates);
});

app.post(apiUrl + "/exchange-rates", checkAuthenticated, async (req, res) => {
	let date = new Date(req.body.date);
	let fromCurrencyId = req.body.fromCurrency;
	let toCurrencyId = req.body.toCurrency;
	let rate = parseFloat(req.body.rate);

	try {
		await exchangeRateService.addExchangeRate(
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

app.put(apiUrl + "/exchange-rate/edit/:id", checkAuthenticated, async (req, res) => {
	let id = parseInt(req.params.id);
	let rate = parseFloat(req.body.rate);

	try {
		await exchangeRateService.updateExchangeRate(id, rate);
	} catch (e) {
		res.status(400).send((<Error>e).message);
		return;
	}

	res.status(200).send();
});

app.delete(
	apiUrl + "/exchange-rates/delete/:id",
	checkAuthenticated,
	async (req, res) => {
		let id = parseInt(req.params.id);

		try {
			await exchangeRateService.deleteExchangeRateById(id);
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
