"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export interface ChartBarLabelItem {
  id: string
  label: string
  value: number
}

interface ChartBarLabelCustomProps {
  title: string
  description?: string
  data: ChartBarLabelItem[]
  valueFormatter?: (value: number) => string
  emptyMessage?: string
  footer?: React.ReactNode
  color?: string
}

const defaultFormatter = (value: number) => value.toLocaleString()

export function ChartBarLabelCustom({
  title,
  description,
  data,
  valueFormatter = defaultFormatter,
  emptyMessage = "No data for this period",
  footer,
  color = "var(--chart-2)",
}: ChartBarLabelCustomProps) {
  const chartConfig = {
    value: {
      label: title,
      color,
    },
    label: {
      color: "var(--background)",
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{
                right: 16,
              }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                hide
              />
              <XAxis dataKey="value" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar dataKey="value" fill="var(--color-value)" radius={4}>
                <LabelList
                  dataKey="label"
                  position="insideLeft"
                  offset={8}
                  className="fill-(--color-label)"
                  fontSize={12}
                />
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                  formatter={(value: string | number | boolean | null | undefined) =>
                    typeof value === "number" ? valueFormatter(value) : value
                  }
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {footer && (
        <CardFooter className="flex-col items-start gap-2 text-sm">{footer}</CardFooter>
      )}
    </Card>
  )
}
