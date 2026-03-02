import { prisma } from '../config/db';
import { ProjectStage } from '@prisma/client';

export interface ChecklistTemplateItem {
  id?: string;
  label: string;
  required?: boolean;
}

export interface CreateTemplatePayload {
  stage: ProjectStage;
  name: string;
  description?: string;
  isDefault?: boolean;
  items: ChecklistTemplateItem[];
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  items?: ChecklistTemplateItem[];
}

export async function getTemplatesByTenant(tenantId: string, stage?: ProjectStage) {
  return await prisma.checklistTemplate.findMany({
    where: {
      tenantId,
      isArchived: false,
      ...(stage ? { stage } : {})
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createTemplate(tenantId: string, payload: CreateTemplatePayload) {
  return await prisma.$transaction(async (tx) => {
    // Atomically unset any existing default for this stage
    if (payload.isDefault) {
      await tx.checklistTemplate.updateMany({
        where: { tenantId, stage: payload.stage, isDefault: true },
        data: { isDefault: false }
      });
    }

    return await tx.checklistTemplate.create({
      data: {
        tenantId,
        stage: payload.stage,
        name: payload.name,
        description: payload.description,
        isDefault: payload.isDefault ?? false,
        items: payload.items as any,
      }
    });
  });
}

export async function updateTemplate(tenantId: string, templateId: string, payload: UpdateTemplatePayload) {
  return await prisma.$transaction(async (tx) => {
    const template = await tx.checklistTemplate.findFirst({
      where: { id: templateId, tenantId, isArchived: false }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Atomically unset others for this stage if setting to default
    if (payload.isDefault && !template.isDefault) {
      await tx.checklistTemplate.updateMany({
        where: { tenantId, stage: template.stage, isDefault: true, id: { not: templateId } },
        data: { isDefault: false }
      });
    }

    return await tx.checklistTemplate.update({
      where: { id: templateId },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.description !== undefined && { description: payload.description }),
        ...(payload.isDefault !== undefined && { isDefault: payload.isDefault }),
        ...(payload.items !== undefined && { items: payload.items as any, version: { increment: 1 } })
      }
    });
  });
}

export async function archiveTemplate(tenantId: string, templateId: string) {
  const template = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, tenantId, isArchived: false }
  });

  if (!template) {
    throw new Error('Template not found');
  }

  if (template.isDefault) {
    throw new Error('Cannot archive a default template. Set another template as default first.');
  }

  return await prisma.checklistTemplate.update({
    where: { id: templateId },
    data: { isArchived: true }
  });
}
