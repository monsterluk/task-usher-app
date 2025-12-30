import { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/documents';

// Ensure upload directory exists
const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

// Get all documents for an order
export const getOrderDocuments = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const result = await pool.query(`
      SELECT
        d.id,
        d.order_id,
        d.filename,
        d.original_name,
        d.mime_type,
        d.file_size,
        d.category,
        d.description,
        d.version,
        d.is_current,
        d.created_at,
        w.name as uploaded_by_name
      FROM documents d
      LEFT JOIN workers w ON d.uploaded_by = w.id
      WHERE d.order_id = $1 AND d.is_current = true
      ORDER BY d.category, d.created_at DESC
    `, [orderId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error getting order documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get documents'
    });
  }
};

// Get document by ID
export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        d.*,
        w.name as uploaded_by_name,
        o.order_number
      FROM documents d
      LEFT JOIN workers w ON d.uploaded_by = w.id
      LEFT JOIN orders o ON d.order_id = o.id
      WHERE d.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error getting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get document'
    });
  }
};

// Upload document (simulated - in production would use multer)
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const {
      order_id,
      filename,
      original_name,
      mime_type,
      file_size,
      file_path,
      category,
      description
    } = req.body;

    const userId = (req as any).user?.id;

    ensureUploadDir();

    const result = await pool.query(`
      INSERT INTO documents (
        order_id, filename, original_name, mime_type, file_size,
        file_path, category, description, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [order_id, filename, original_name, mime_type, file_size, file_path, category, description, userId]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document'
    });
  }
};

// Update document metadata
export const updateDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, description } = req.body;

    const result = await pool.query(`
      UPDATE documents
      SET category = COALESCE($1, category),
          description = COALESCE($2, description),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [category, description, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Document updated successfully'
    });
  } catch (error) {
    logger.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update document'
    });
  }
};

// Delete document
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get file path before deleting
    const docResult = await pool.query('SELECT file_path FROM documents WHERE id = $1', [id]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Delete from database
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);

    // Try to delete file from filesystem
    const filePath = docResult.rows[0].file_path;
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fsError) {
        logger.warn('Could not delete file from filesystem:', fsError);
      }
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
};

// Get document versions
export const getDocumentVersions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        dv.*,
        w.name as uploaded_by_name
      FROM document_versions dv
      LEFT JOIN workers w ON dv.uploaded_by = w.id
      WHERE dv.document_id = $1
      ORDER BY dv.version DESC
    `, [id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error getting document versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get document versions'
    });
  }
};

// Upload new version
export const uploadNewVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filename, file_path, file_size, change_notes } = req.body;
    const userId = (req as any).user?.id;

    // Get current document
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const doc = docResult.rows[0];
    const newVersion = doc.version + 1;

    // Save old version to history
    await pool.query(`
      INSERT INTO document_versions (document_id, version, filename, file_path, file_size, change_notes, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, doc.version, doc.filename, doc.file_path, doc.file_size, 'Poprzednia wersja', doc.uploaded_by]);

    // Update document with new version
    const result = await pool.query(`
      UPDATE documents
      SET filename = $1,
          file_path = $2,
          file_size = $3,
          version = $4,
          uploaded_by = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [filename, file_path, file_size, newVersion, userId, id]);

    // Also save new version to history
    await pool.query(`
      INSERT INTO document_versions (document_id, version, filename, file_path, file_size, change_notes, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, newVersion, filename, file_path, file_size, change_notes || 'Nowa wersja', userId]);

    res.json({
      success: true,
      data: result.rows[0],
      message: `Document updated to version ${newVersion}`
    });
  } catch (error) {
    logger.error('Error uploading new version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload new version'
    });
  }
};

// Get documents by category
export const getDocumentsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const result = await pool.query(`
      SELECT
        d.*,
        o.order_number,
        o.product_name,
        w.name as uploaded_by_name
      FROM documents d
      JOIN orders o ON d.order_id = o.id
      LEFT JOIN workers w ON d.uploaded_by = w.id
      WHERE d.category = $1 AND d.is_current = true
      ORDER BY d.created_at DESC
      LIMIT 100
    `, [category]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error getting documents by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get documents'
    });
  }
};

// Get document statistics
export const getDocumentStats = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        category,
        COUNT(*) as count,
        SUM(file_size) as total_size
      FROM documents
      WHERE is_current = true
      GROUP BY category
      ORDER BY count DESC
    `);

    const totalResult = await pool.query(`
      SELECT
        COUNT(*) as total_documents,
        SUM(file_size) as total_size,
        COUNT(DISTINCT order_id) as orders_with_documents
      FROM documents
      WHERE is_current = true
    `);

    res.json({
      success: true,
      data: {
        by_category: result.rows.map((r: any) => ({
          category: r.category,
          count: parseInt(r.count),
          total_size: parseInt(r.total_size) || 0
        })),
        totals: {
          total_documents: parseInt(totalResult.rows[0].total_documents) || 0,
          total_size: parseInt(totalResult.rows[0].total_size) || 0,
          orders_with_documents: parseInt(totalResult.rows[0].orders_with_documents) || 0
        }
      }
    });
  } catch (error) {
    logger.error('Error getting document stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get document statistics'
    });
  }
};
