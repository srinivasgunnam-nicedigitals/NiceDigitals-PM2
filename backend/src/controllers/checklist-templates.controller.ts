import { Request, Response } from 'express';
import * as templateService from '../services/checklist-templates.service';
import { createChecklistTemplateSchema, updateChecklistTemplateSchema } from '../utils/validation';

export async function getTemplates(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const stage = req.query.stage as any; // Optional phase filter
    const templates = await templateService.getTemplatesByTenant(tenantId, stage);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createTemplate(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const payload = createChecklistTemplateSchema.parse(req.body);
    const template = await templateService.createTemplate(tenantId, payload);
    res.status(201).json(template);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function updateTemplate(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const templateId = req.params.id;
    const payload = updateChecklistTemplateSchema.parse(req.body);
    const template = await templateService.updateTemplate(tenantId, templateId, payload);
    res.json(template);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function archiveTemplate(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const templateId = req.params.id;
    await templateService.archiveTemplate(tenantId, templateId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
