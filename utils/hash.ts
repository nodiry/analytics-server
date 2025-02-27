import { password } from "bun";

export const hash = async (input: string) => {
  return await password.hash(input, { algorithm: "bcrypt", cost: 10 });
};

export const verify = async (input: string, hashedPassword: string) => {
  return await password.verify(input, hashedPassword);
};