import {Column, DataType, Max, Model, PrimaryKey, Table} from "sequelize-typescript";

@Table
export default class User extends Model {
  @Column({ primaryKey: true, type: DataType.INTEGER, autoIncrement: true })
  id!: number;

  @Max(120)
  @Column({ type: DataType.TEXT })
  email!: string;

  @Max(64)
  @Column({ type: DataType.TEXT })
  password!: string;
}