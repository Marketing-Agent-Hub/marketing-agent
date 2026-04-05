import { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { deleteItemsSchema, getItemByIdSchema, getItemsSchema, getReadyItemsSchema } from './item.schema.js';
import { itemService } from './item.service.js';

export const getItems = asyncHandler(async (req: Request, res: Response) => {
    const params = getItemsSchema.parse(req.query);
    const result = await itemService.getItems(params as any);
    res.json({ success: true, data: result });
});

export const getItemById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = getItemByIdSchema.parse(req.params);
    const item = await itemService.getItemById(id);

    if (!item) {
        res.status(404).json({ success: false, error: 'Item not found' });
        return;
    }

    res.json({ success: true, data: item });
});

export const getReadyItems = asyncHandler(async (req: Request, res: Response) => {
    const params = getReadyItemsSchema.parse(req.query);
    const result = await itemService.getReadyItems(params as any);
    res.json({ success: true, data: result });
});

export const getItemsStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await itemService.getItemsStats();
    res.json({ success: true, data: stats });
});

export const deleteAllItems = asyncHandler(async (_req: Request, res: Response) => {
    const result = await itemService.deleteAllItems();
    res.json({
        success: true,
        data: {
            deleted: result.count,
            message: `Successfully deleted ${result.count} item(s) (except ready items)`,
        },
    });
});

export const deleteAllReadyItems = asyncHandler(async (_req: Request, res: Response) => {
    const result = await itemService.deleteAllReadyItems();
    res.json({
        success: true,
        data: {
            deleted: result.count,
            message: `Successfully deleted ${result.count} ready item(s)`,
        },
    });
});

export const deleteItems = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = deleteItemsSchema.parse(req.body);
    const result = await itemService.deleteItems(ids);
    res.json({
        success: true,
        data: {
            deleted: result.count,
            message: `Successfully deleted ${result.count} item(s)`,
        },
    });
});
