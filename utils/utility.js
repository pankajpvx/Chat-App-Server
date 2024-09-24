import { userSocketIds } from "../app.js";

class ErrorHandler extends Error {
  constructor(message, statuCode) {
    super(message);
    this.statusCode = statuCode;
  }
}

const getSockets = (users = []) => {
  const sockets = users.map((user) => userSocketIds.get(user.toString()));
  return sockets;
};
export { ErrorHandler, getSockets };
