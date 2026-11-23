import * as React from "react";

import { cn } from "@/app/lib/utils";

export interface TableColumn<T = unknown> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
}

export interface TableProps<T = unknown>
  extends React.TableHTMLAttributes<HTMLTableElement> {
  columns?: TableColumn<T>[];
  rows?: T[];
  keyExtractor?: (row: T, index: number) => string;
  emptyText?: React.ReactNode;
}

const TableInner = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto rounded-xl border border-border bg-card shadow-sm">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
TableInner.displayName = "TableInner";

function TableBase(
  { className, columns, rows, keyExtractor, emptyText, children, ...props }: TableProps<unknown>,
  ref: React.ForwardedRef<HTMLTableElement>
) {
  if (columns && rows) {
    return (
      <TableInner ref={ref} className={className} {...props}>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyText ?? "No results."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow
                key={keyExtractor ? keyExtractor(row, index) : index}
              >
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {col.render
                      ? col.render(row)
                      : ((row as Record<string, unknown>)[col.key] as
                          | React.ReactNode
                          | undefined) ?? "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </TableInner>
    );
  }

  return (
    <TableInner ref={ref} className={className} {...props}>
      {children}
    </TableInner>
  );
}

const Table = React.forwardRef<HTMLTableElement, TableProps<unknown>>(TableBase) as <T = unknown>(
  props: TableProps<T> & { ref?: React.ForwardedRef<HTMLTableElement> }
) => React.ReactElement | null;

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-muted/50 [&_tr]:border-b [&_tr]:border-border", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 whitespace-nowrap px-4 text-start align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground [&:has([role=checkbox])]:pe-0 [&:not(:last-child)]:border-e [&:not(:last-child)]:border-border/50",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3.5 align-middle [&:has([role=checkbox])]:pe-0 [&:not(:last-child)]:border-e [&:not(:last-child)]:border-border/40", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
