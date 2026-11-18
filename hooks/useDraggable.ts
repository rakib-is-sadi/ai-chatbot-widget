import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Offset = {
  right: number;
  bottom: number;
};

type Point = {
  x: number;
  y: number;
};

type Options = {
  width: number;
  height: number;
  initialRight: number;
  initialBottom: number;
};

const DRAG_THRESHOLD = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function useDraggable({
  width,
  height,
  initialRight,
  initialBottom,
}: Options) {
  // Distance from the bottom-right corner of the viewport.
  const [offset, setOffset] = useState<Offset>({
    right: initialRight,
    bottom: initialBottom,
  });
  const pointerStart = useRef<Point>({ x: 0, y: 0 });
  const offsetStart = useRef<Offset>({ right: 0, bottom: 0 });
  const moved = useRef(false);

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = offset;
    moved.current = false;
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) moved.current = true;
    if (!moved.current) return;

    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    setOffset({
      right: clamp(offsetStart.current.right - dx, 0, viewportWidth - width),
      bottom: clamp(offsetStart.current.bottom - dy, 0, viewportHeight - height),
    });
  }

  // CSS keeps the element inside the viewport, even after the window is resized.
  const right = `max(0px, min(${offset.right}px, calc(100% - ${width}px)))`;
  const bottom = `max(0px, min(${offset.bottom}px, calc(100% - ${height}px)))`;

  return {
    right,
    bottom,
    dragHandlers: { onPointerDown, onPointerMove },
    // Lets a click handler ignore the click that ends a drag.
    wasDragged: () => moved.current,
  };
}