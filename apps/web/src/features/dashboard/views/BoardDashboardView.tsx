import type { ReactNode } from "react";

import { closestCorners, DndContext, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DashboardBoardColumn, DashboardPreferencesV1 } from "@creator/data-contracts";
import { Badge, cn } from "@creator/ui";

import { dashboardBoardColumns, type DashboardActionCard } from "../customization";

const boardColumnLabels: Record<DashboardBoardColumn, string> = {
  today: "今天",
  next: "下一步",
  this_week: "本周",
  done: "已完成"
};

const boardColumnTones: Record<DashboardBoardColumn, "blue" | "amber" | "green" | "neutral"> = {
  today: "blue",
  next: "amber",
  this_week: "neutral",
  done: "green"
};

const findColumnForId = (columns: DashboardPreferencesV1["board"]["columns"], id: string) => {
  if (dashboardBoardColumns.includes(id as DashboardBoardColumn)) {
    return id as DashboardBoardColumn;
  }

  return dashboardBoardColumns.find((column) => columns[column].includes(id));
};

export const BoardDashboardView = ({
  actions,
  editing,
  preferences,
  updatePreferences
}: {
  actions: DashboardActionCard[];
  editing: boolean;
  preferences: DashboardPreferencesV1;
  updatePreferences: (updater: (current: DashboardPreferencesV1) => DashboardPreferencesV1) => void;
}) => {
  const actionById = new Map(actions.map((action) => [action.id, action]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    updatePreferences((current) => {
      const activeId = String(active.id);
      const overId = String(over.id);
      const sourceColumn = findColumnForId(current.board.columns, activeId);
      const targetColumn = findColumnForId(current.board.columns, overId);

      if (!sourceColumn || !targetColumn) {
        return current;
      }

      const nextColumns = {
        today: [...current.board.columns.today],
        next: [...current.board.columns.next],
        this_week: [...current.board.columns.this_week],
        done: [...current.board.columns.done]
      };

      if (sourceColumn === targetColumn) {
        const oldIndex = nextColumns[sourceColumn].indexOf(activeId);
        const newIndex = nextColumns[targetColumn].indexOf(overId);

        if (oldIndex < 0 || newIndex < 0) {
          return current;
        }

        nextColumns[sourceColumn] = arrayMove(nextColumns[sourceColumn], oldIndex, newIndex);
      } else {
        nextColumns[sourceColumn] = nextColumns[sourceColumn].filter((id) => id !== activeId);
        const overIndex = nextColumns[targetColumn].indexOf(overId);
        const insertIndex = overIndex >= 0 ? overIndex : nextColumns[targetColumn].length;
        nextColumns[targetColumn].splice(insertIndex, 0, activeId);
      }

      return {
        ...current,
        board: {
          columns: nextColumns
        }
      };
    });
  };

  const content = (
    <div className="grid items-start gap-4 xl:grid-cols-4">
      {dashboardBoardColumns.map((column) => (
        <BoardColumn key={column} actionById={actionById} column={column} editing={editing} ids={preferences.board.columns[column]} />
      ))}
    </div>
  );

  if (!editing) {
    return content;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      {content}
    </DndContext>
  );
};

const BoardColumn = ({
  actionById,
  column,
  editing,
  ids
}: {
  actionById: Map<string, DashboardActionCard>;
  column: DashboardBoardColumn;
  editing: boolean;
  ids: string[];
}) => {
  if (!editing) {
    return (
      <section className="rounded-[18px] bg-zinc-100/70 p-3 shadow-[inset_0_0_0_1px_rgba(228,228,231,0.7)]">
        <BoardColumnHeader column={column} count={ids.length} />
        <div className="min-h-[180px] space-y-3">
          {ids.map((id) => {
            const action = actionById.get(id);
            return action ? <BoardActionCard key={id} action={action} editing={editing} /> : null;
          })}
        </div>
      </section>
    );
  }

  return <DroppableBoardColumn actionById={actionById} column={column} editing={editing} ids={ids} />;
};

const DroppableBoardColumn = ({
  actionById,
  column,
  editing,
  ids
}: {
  actionById: Map<string, DashboardActionCard>;
  column: DashboardBoardColumn;
  editing: boolean;
  ids: string[];
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: column });
  return (
    <section className={cn("rounded-[18px] bg-zinc-100/70 p-3 shadow-[inset_0_0_0_1px_rgba(228,228,231,0.7)]", isOver && "bg-white")}>
      <BoardColumnHeader column={column} count={ids.length} />
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="min-h-[180px] space-y-3">
          {ids.map((id) => {
            const action = actionById.get(id);
            return action ? <BoardActionCard key={id} action={action} editing={editing} /> : null;
          })}
        </div>
      </SortableContext>
    </section>
  );
};

const BoardColumnHeader = ({ column, count }: { column: DashboardBoardColumn; count: number }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-semibold text-zinc-950">{boardColumnLabels[column]}</h2>
      <Badge tone={boardColumnTones[column]}>{count}</Badge>
    </div>
  </div>
);

const SortableShell = ({ children, disabled, id }: { children: ReactNode; disabled: boolean; id: string }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-20 opacity-70")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

const BoardActionCard = ({ action, editing }: { action: DashboardActionCard; editing: boolean }) => {
  const card = <BoardActionCardContent action={action} editing={editing} />;

  if (!editing) {
    return card;
  }

  return <SortableShell disabled={false} id={action.id}>{card}</SortableShell>;
};

const BoardActionCardContent = ({ action, editing }: { action: DashboardActionCard; editing: boolean }) => (
  <article className={cn("rounded-xl bg-white p-3 shadow-[0_1px_1px_rgba(24,24,27,0.024),0_8px_26px_rgba(24,24,27,0.035)]", editing && "cursor-grab active:cursor-grabbing")}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-950">{action.label}</p>
        <p className="mt-1 text-xs font-medium text-zinc-500">{action.insightTitle}</p>
      </div>
      <Badge tone={action.effort === "low" ? "green" : action.effort === "medium" ? "amber" : "red"}>{action.effort}</Badge>
    </div>
    <p className="mt-2 text-xs leading-5 text-zinc-600">{action.detail}</p>
  </article>
);
