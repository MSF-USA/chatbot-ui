import { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  res.status(410).json({ error: 'Endpoint no longer supported' });
};

export default handler;
