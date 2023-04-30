import User  from "../models/user";
import jwt from "jsonwebtoken";
import { Repository } from "sequelize-typescript";

export class UserService {
	private userRepository: Repository<User>;
	private secret: string = "lab3";

	public constructor(userRepository: Repository<User>) {
		this.userRepository = userRepository;
	}

	public async addUser(email: string, password: string) {
		let user = new User({email: email, password: password});
		await user.save();
	}

	public async login(email: string, password: string) {
		let user = await this.getUserByEmailAndPassword(email, password);

		if (user != null) {
			return jwt.sign({email}, this.secret);
		}
	}

	public async getUserByEmailAndPassword(email: string, password: string): Promise<User | null> {
		return await this.userRepository.findOne({where: {email: email, password: password}});
	}

	public isTokenValid(token: string) : boolean {
		let verifiedToken = jwt.verify(token, this.secret);

		if (verifiedToken) {
			return true;
		}

		return false;
	}
}
