
import { z } from 'zod';

export const PointSchema = z.object({
  x: z.number().describe('The x-coordinate of the point.'),
  y: z.number().describe('The y-coordinate of the point.'),
});
export type Point = z.infer<typeof PointSchema>;

export const ShapeStyleSchema = z.object({
  strokeColor: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$|^transparent$/, 'Invalid hex color or transparent').describe('The color of the stroke, e.g., "#RRGGBB" or "transparent". Default: "#000000".'),
  fillColor: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$|^transparent$/, 'Invalid hex color or transparent').describe('The fill color of the shape, e.g., "#RRGGBB" or "transparent". Default: "transparent".'),
  strokeWidth: z.number().min(0).describe('The width of the stroke in pixels. Default: 2.'),
  fontSize: z.number().min(1).describe('The font size for text shapes, in pixels. Default: 16.'),
  fontFamily: z.string().describe('The font family for text shapes, e.g., "Arial, sans-serif". Default: "Arial, sans-serif".'),
});
export type ShapeStyle = z.infer<typeof ShapeStyleSchema>;

// Base schema for common properties of all shapes for AI generation.
// Does not include the 'type' field as it's used as the discriminator.
const BaseShapeSchemaZod = z.object({
  id: z.string().describe('A unique identifier for the shape. It is recommended to use a v4 UUID string, though the schema does not strictly enforce the UUID format. Ensure uniqueness within the diagram.'),
  style: ShapeStyleSchema.describe('The styling properties for the shape. Follow default values if not specified otherwise by context.'),
  x: z.number().describe('The primary x-coordinate of the shape (e.g., top-left for rectangle, center for circle, top-left for text).'),
  y: z.number().describe('The primary y-coordinate of the shape (e.g., top-left for rectangle, center for circle, top-left for text).'),
  rotation: z.number().min(0).max(360).optional().describe('The rotation angle of the shape in degrees (0-360). Default: 0. Optional.'),
});

// Specific shape schemas for AI, extending the base schema
const RectangleShapeSchemaZod = BaseShapeSchemaZod.extend({
  type: z.enum(['rectangle']).describe("The type identifier for this shape. MUST be the exact string 'rectangle'."),
  width: z.number().min(1).describe('The width of the rectangle. Must be a positive number.'),
  height: z.number().min(1).describe('The height of the rectangle. Must be a positive number.'),
});

const CircleShapeSchemaZod = BaseShapeSchemaZod.extend({
  type: z.enum(['circle']).describe("The type identifier for this shape. MUST be the exact string 'circle'."),
  radius: z.number().min(1).describe('The radius of the circle. Must be a positive number.'),
  // x and y for circle are its center.
});

const LineShapeSchemaZod = BaseShapeSchemaZod.extend({
  type: z.enum(['line']).describe("The type identifier for this shape. MUST be the exact string 'line'."),
  points: z.array(PointSchema).length(2, { message: "Line 'points' must be an array of exactly two Point objects." }).describe('An array of exactly two Points: [startPoint, endPoint]. The top-level x/y for this shape can be the coordinates of the first point in this array, or (0,0) if points are absolute world coordinates.'),
});

const ArrowShapeSchemaZod = BaseShapeSchemaZod.extend({
  type: z.enum(['arrow']).describe("The type identifier for this shape. MUST be the exact string 'arrow'."),
  points: z.array(PointSchema).length(2, { message: "Arrow 'points' must be an array of exactly two Point objects." }).describe('An array of exactly two Points: [startPoint, endPoint]. The top-level x/y for this shape can be the coordinates of the first point in this array, or (0,0) if points are absolute world coordinates.'),
});

const TextShapeSchemaZod = BaseShapeSchemaZod.extend({
  type: z.enum(['text']).describe("The type identifier for this shape. MUST be the exact string 'text'."),
  text: z.string().min(1, { message: "Text content for a 'text' shape cannot be empty." }).describe('The text content. Must not be empty.'),
  width: z.number().min(1).optional().describe('Optional: The estimated width of the text bounding box. If provided, must be positive. Helpful for layout if determinable.'),
  height: z.number().min(1).optional().describe('Optional: The estimated height of the text bounding box. If provided, must be positive. Helpful for layout if determinable.'),
});

// This is the primary schema for a single shape that the AI will generate.
// It uses a discriminated union based on the 'type' field.
export const DrawingShapeSchema = z.discriminatedUnion('type', [
  RectangleShapeSchemaZod,
  CircleShapeSchemaZod,
  LineShapeSchemaZod,
  ArrowShapeSchemaZod,
  TextShapeSchemaZod,
]).describe('A single drawable shape on the canvas. It must be one of the specified types. Ensure the `type` field is one of: "rectangle", "circle", "line", "arrow", "text", and all required fields for that type are present. Omit fields not applicable to a given shape type.');
export type DrawingShape = z.infer<typeof DrawingShapeSchema>;


// Schema for the AI flow input (remains the same)
export const AiPromptInputSchema = z.object({
  prompt: z.string().describe('The user\'s text prompt for generating content (e.g., a diagram, board, timeline, or plan).'),
});
export type AiPromptInput = z.infer<typeof AiPromptInputSchema>;

// Schema for the AI flow output for diagrams
export const AiGeneratedShapesSchema = z.object({
  shapes: z.array(DrawingShapeSchema).describe('An array of shapes generated by the AI for a diagram. Each shape must conform to one of the specified shape types and include all its required fields. The `type` string must exactly match one of: "rectangle", "circle", "line", "arrow", "text".'),
});
export type AiGeneratedShapes = z.infer<typeof AiGeneratedShapesSchema>;


// --- Schemas for other AI generation types ---

// Board Item Schema
export const BoardItemSchema = z.object({
    id: z.string().describe("Unique ID for the board item (should be a UUID v4, but not strictly enforced by schema for API compatibility)."),
    type: z.enum(['note', 'topic', 'action_item', 'question', 'idea']).describe("Type of board item."),
    content: z.string().min(1).describe("Text content of the item."),
    x: z.number().describe("Conceptual X position on the board (e.g., 0-1000)."),
    y: z.number().describe("Conceptual Y position on the board (e.g., 0-700)."),
    width: z.number().min(20).optional().describe("Conceptual width of the item. Default: 150."),
    height: z.number().min(20).optional().describe("Conceptual height of the item. Default: 100."),
    color: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$|^transparent$/).optional().describe("Background color for the item (e.g., a sticky note hex color like #FFFF88). Optional.")
});
export type BoardItem = z.infer<typeof BoardItemSchema>;

export const AiGeneratedBoardSchema = z.object({
    title: z.string().optional().describe("Optional title for the generated board."),
    items: z.array(BoardItemSchema).describe("Array of items for the board (e.g., sticky notes, topics). Position items thoughtfully on a conceptual canvas (e.g., 1000x700).")
});
export type AiGeneratedBoard = z.infer<typeof AiGeneratedBoardSchema>;


// Timeline Event Schema
export const TimelineEventSchema = z.object({
    id: z.string().describe("Unique ID for the timeline event (should be a UUID v4, but not strictly enforced by schema for API compatibility)."),
    title: z.string().min(1).describe("Title of the event."),
    date: z.string().describe("Date of the event (e.g., 'YYYY-MM-DD', 'Q1 2024', 'Mid-June'). Be consistent in format if possible."),
    description: z.string().optional().describe("Optional description of the event."),
    category: z.string().optional().describe("Optional category for visual grouping or filtering (e.g., 'Milestone', 'Phase 1')."),
    color: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/).optional().describe("Optional hex color for the event marker or entry."),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const AiGeneratedTimelineSchema = z.object({
    title: z.string().optional().describe("Optional title for the generated timeline."),
    events: z.array(TimelineEventSchema).describe("Array of events for the timeline, ordered chronologically if possible.")
});
export type AiGeneratedTimeline = z.infer<typeof AiGeneratedTimelineSchema>;

// Project Plan Task Schema
export const ProjectPlanTaskSchema = z.object({
    id: z.string().describe("Unique ID for the task (should be a UUID v4, but not strictly enforced by schema for API compatibility)."),
    name: z.string().min(1).describe("Name of the task."),
    assignee: z.string().optional().describe("Person or team assigned to the task. Optional."),
    startDate: z.string().optional().describe("Start date (e.g., 'YYYY-MM-DD'). Optional."),
    endDate: z.string().optional().describe("End date (e.g., 'YYYY-MM-DD'). Optional."),
    duration: z.string().optional().describe("Estimated duration (e.g., '3 days', '1 week'). Optional if start/end dates are given."),
    status: z.enum(['todo', 'in_progress', 'completed', 'blocked', 'on_hold']).optional().describe("Current status of the task. Optional, default to 'todo' if not specified."),
    dependencies: z.array(z.string()).optional().describe("Array of task IDs this task depends on (these IDs should also be UUIDs, but not strictly enforced by schema for API compatibility). Optional."),
    description: z.string().optional().describe("Detailed description or notes for the task. Optional."),
    priority: z.enum(['low', 'medium', 'high']).optional().describe("Priority of the task. Optional."),
});
export type ProjectPlanTask = z.infer<typeof ProjectPlanTaskSchema>;

export const AiGeneratedProjectPlanSchema = z.object({
    projectName: z.string().optional().describe("Optional name of the project."),
    tasks: z.array(ProjectPlanTaskSchema).describe("Array of tasks for the project plan. Define clear tasks with appropriate details. Consider logical flow and dependencies.")
});
export type AiGeneratedProjectPlan = z.infer<typeof AiGeneratedProjectPlanSchema>;
