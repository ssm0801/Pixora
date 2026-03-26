import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: string;
}

export const generateToken = (id: string): string => {
  return jwt.sign({ id } as TokenPayload, process.env.JWT_SECRET as string, {
    expiresIn: '24h',
  });
};
