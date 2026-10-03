import { forbiddenResponse, methodNotAllowed } from '@/lib/server/apiHelpers';

export async function GET() {
  return forbiddenResponse('Direct access to raw Google Sheets data has been disabled. Please use /api/portfolio.');
}

export async function POST() {
  return methodNotAllowed(['GET']);
}

export async function PUT() {
  return methodNotAllowed(['GET']);
}

export async function DELETE() {
  return methodNotAllowed(['GET']);
}

export async function PATCH() {
  return methodNotAllowed(['GET']);
}
