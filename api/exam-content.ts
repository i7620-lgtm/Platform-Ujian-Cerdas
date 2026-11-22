import {
  EXAM_CONTENT_CORS_HEADERS,
  handleExamMetaRequest,
  handleExamSolutionsRequest,
  handleExamTestRequest,
  handleExamWarmRequest,
  sendExamContentResponse,
} from '../shared/examContentCore';
import {
  handleExamKeyRequest,
  handleExamTursoDeleteRequest,
  handleExamTursoSyncRequest,
} from '../shared/tursoServerCore';

function extractBearerToken(req: any): string {
  const rawAuth =
    (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const str = String(rawAuth).trim();
  if (/^Bearer\s+/i.test(str)) {
    return str.replace(/^Bearer\s+/i, '').trim();
  }
  return '';
}

export default async function handler(req: any, res: any) {
  for (const [key, value] of Object.entries(EXAM_CONTENT_CORS_HEADERS)) {
    res.setHeader(key, value);
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const reqUrl = new URL(req.url || '/', 'http://localhost');
  const invokePath =
    (req.headers && (req.headers['x-invoke-path'] || req.headers['x-matched-path'])) ||
    reqUrl.pathname ||
    '/';
  const invokePathname = new URL(String(invokePath), 'http://localhost').pathname.replace(/\/+$/, '');
  const reqPathname = reqUrl.pathname.replace(/\/+$/, '');

  const routeMatch =
    reqPathname.match(/\/api\/exam-content\/([^/]+)\/(meta|test|solutions|warm|key|sync-turso|delete-turso)/) ||
    invokePathname.match(/\/api\/exam-content\/([^/]+)\/(meta|test|solutions|warm|key|sync-turso|delete-turso)/);

  let parsedBody: any = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      parsedBody = {};
    }
  }

  const rawCode = routeMatch
    ? routeMatch[1]
    : req.query?.code || reqUrl.searchParams.get('code') || parsedBody?.code || parsedBody?.examBundle?.code || '';
  const code = String(rawCode || '').trim().toUpperCase();

  const action = routeMatch
    ? routeMatch[2]
    : req.query?.action ||
      req.query?.type ||
      reqUrl.searchParams.get('action') ||
      reqUrl.searchParams.get('type') ||
      (reqPathname.endsWith('/warm') || invokePathname.endsWith('/warm') ? 'warm' : 'test');

  const versionParam = req.query?.v || reqUrl.searchParams.get('v');
  const parsedVersion = versionParam ? parseInt(String(versionParam), 10) : NaN;
  const versionNum = Number.isFinite(parsedVersion) ? parsedVersion : undefined;

  const isPreview =
    req.query?.preview === 'true' ||
    req.query?.isPreview === 'true' ||
    reqUrl.searchParams.get('preview') === 'true' ||
    reqUrl.searchParams.get('isPreview') === 'true';

  if (!code) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ success: false, error: 'Exam code is required' });
  }

  try {
    if (action === 'meta') {
      const result = await handleExamMetaRequest({ code, isPreview });
      return sendExamContentResponse(res, result);
    }

    if (action === 'test') {
      const ifNoneMatch =
        req.headers && typeof req.headers['if-none-match'] === 'string'
          ? req.headers['if-none-match']
          : undefined;
      const result = await handleExamTestRequest({
        code,
        versionNum,
        isPreview,
        ifNoneMatch,
      });
      return sendExamContentResponse(res, result);
    }

    if (action === 'solutions') {
      const studentId = req.query?.studentId || reqUrl.searchParams.get('studentId') || '';
      const proctorToken =
        req.query?.token || reqUrl.searchParams.get('token') || (req.headers && req.headers['x-proctor-token']) || '';
      const deviceId =
        req.query?.deviceId || reqUrl.searchParams.get('deviceId') || (req.headers && req.headers['x-device-id']) || '';
      const resultId =
        req.query?.resultId || reqUrl.searchParams.get('resultId') || (req.headers && req.headers['x-result-id']) || '';

      const result = await handleExamSolutionsRequest({
        code,
        studentId: String(studentId),
        proctorToken: String(proctorToken),
        deviceId: String(deviceId),
        resultId: String(resultId),
      });
      return sendExamContentResponse(res, result);
    }

    if (action === 'warm') {
      const result = await handleExamWarmRequest({
        code,
        versionNum,
        method: req.method,
        examBundle: parsedBody?.examBundle,
      });
      return sendExamContentResponse(res, result);
    }

    if (action === 'key') {
      const result = await handleExamKeyRequest({ code, isPreview });
      return sendExamContentResponse(res, result);
    }

    if (action === 'sync-turso') {
      const bearerToken = extractBearerToken(req);
      const proctorToken =
        (req.headers && req.headers['x-proctor-token']) ||
        req.query?.token ||
        reqUrl.searchParams.get('token') ||
        '';
      const result = await handleExamTursoSyncRequest({
        code,
        bearerToken,
        proctorToken: String(proctorToken),
      });
      return sendExamContentResponse(res, result);
    }

    if (action === 'delete-turso') {
      const bearerToken = extractBearerToken(req);
      const proctorToken =
        (req.headers && req.headers['x-proctor-token']) ||
        req.query?.token ||
        reqUrl.searchParams.get('token') ||
        '';
      const result = await handleExamTursoDeleteRequest({
        code,
        bearerToken,
        proctorToken: String(proctorToken),
      });
      return sendExamContentResponse(res, result);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
  } catch (err: any) {
    console.error('Exam content handler error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
  }
}
