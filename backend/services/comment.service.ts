import { CommentRepository } from "../repositories/comment.repository.ts";
import { ServiceResult } from "../types/api.types.ts";
import { Comment } from "../types/comment.types.ts";
import { sanitizeInput, validateCommentContent } from "../lib/validation.ts";
import { AppError, ValidationError } from "../utils/errors.ts";
import { AuthService } from "./auth.service.ts";
import { isUserCommentRateLimited } from "../middleware/rateLimit.ts";

export class CommentService {
  private repository: CommentRepository;
  private authService: AuthService;

  constructor(
    repository: CommentRepository = new CommentRepository(),
    authService: AuthService = new AuthService(),
  ) {
    this.repository = repository;
    this.authService = authService;
  }

  async createComment(
    postId: string,
    userId: string,
    content: string,
  ): Promise<ServiceResult<Comment>> {
    try {
      if (isUserCommentRateLimited(userId)) {
        return { success: false, error: new AppError("Rate limit exceeded", 429) };
      }

      const sanitized = sanitizeInput(content);
      const validation = validateCommentContent(sanitized);
      if (!validation.isValid) {
        return {
          success: false,
          error: new ValidationError(
            validation.errors.content || "Invalid comment content",
          ),
        };
      }

      const postExists = await this.repository.postExists(postId);
      if (!postExists) {
        return { success: false, error: new AppError("Post not found", 404) };
      }

      const comment = await this.repository.createComment({
        post_id: postId,
        user_id: userId,
        content: sanitized,
        is_pinned: false,
      });

      return { success: true, data: comment };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async updateComment(
    commentId: string,
    userId: string,
    content: string,
  ): Promise<ServiceResult<Comment>> {
    try {
      const existing = await this.repository.getCommentById(commentId);
      if (!existing) {
        return { success: false, error: new AppError("Comment not found", 404) };
      }

      if (existing.user_id !== userId) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const sanitized = sanitizeInput(content);
      const validation = validateCommentContent(sanitized);
      if (!validation.isValid) {
        return {
          success: false,
          error: new ValidationError(
            validation.errors.content || "Invalid comment content",
          ),
        };
      }

      const updated = await this.repository.updateComment(commentId, sanitized);
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async deleteComment(
    commentId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<ServiceResult<boolean>> {
    try {
      const existing = await this.repository.getCommentById(commentId);
      if (!existing) {
        return { success: false, error: new AppError("Comment not found", 404) };
      }

      if (!isAdmin && existing.user_id !== userId) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const deleted = await this.repository.deleteComment(commentId);
      return { success: true, data: deleted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async pinComment(
    commentId: string,
    userId: string,
  ): Promise<ServiceResult<Comment>> {
    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const existing = await this.repository.getCommentById(commentId);
      if (!existing) {
        return { success: false, error: new AppError("Comment not found", 404) };
      }

      if (existing.is_pinned) {
        return { success: false, error: new AppError("Comment already pinned", 400) };
      }

      const updated = await this.repository.togglePinComment(commentId, true);
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async unpinComment(
    commentId: string,
    userId: string,
  ): Promise<ServiceResult<Comment>> {
    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const existing = await this.repository.getCommentById(commentId);
      if (!existing) {
        return { success: false, error: new AppError("Comment not found", 404) };
      }

      if (!existing.is_pinned) {
        return { success: false, error: new AppError("Comment is not pinned", 400) };
      }

      const updated = await this.repository.togglePinComment(commentId, false);
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async getPostComments(postId: string): Promise<ServiceResult<Comment[]>> {
    try {
      const comments = await this.repository.getCommentsByPost(postId);
      return { success: true, data: comments };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }
}
