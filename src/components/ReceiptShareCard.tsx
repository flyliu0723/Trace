import React, { forwardRef } from 'react';
import { Text, View } from 'react-native';
import {
  formatReceiptDuration,
  type ReceiptCategorySection,
  type ReceiptAppLine,
  type ShareReceipt,
} from '../analysis/receiptShareFormatter';
import { getCategoryColor } from '../analysis/appClassifier';
import { AppIconBadge } from './HourlyAppRow';
import { tabularNums } from '../theme';

const RECEIPT_WIDTH = 360;

const receiptColors = {
  paper: '#F7F2E8',
  paperShadow: '#E6DDD0',
  ink: '#2A2620',
  inkMuted: '#5C5650',
  inkFaint: '#9A948C',
  brand: '#5E81AC',
  dash: '#C8BFB2',
  highlight: '#EDE6DA',
  barEmpty: '#E0D8CC',
};

const receiptTypography = {
  brand: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 2.4 },
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.5 },
  date: { fontSize: 14, fontWeight: '600' as const },
  section: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2 },
  metricLabel: { fontSize: 10, fontWeight: '500' as const },
  metricValue: { fontSize: 16, fontWeight: '800' as const, ...tabularNums },
  appName: { fontSize: 14, fontWeight: '600' as const },
  appMeta: { fontSize: 11, fontWeight: '500' as const, ...tabularNums },
  footer: { fontSize: 10, fontWeight: '500' as const },
  others: { fontSize: 12, fontWeight: '600' as const },
  weekLabel: { fontSize: 9, fontWeight: '500' as const, ...tabularNums },
};

function DashedRule({ marginVertical = 14 }: { marginVertical?: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginVertical,
        overflow: 'hidden',
        justifyContent: 'center',
      }}>
      {Array.from({ length: 28 }).map((_, index) => (
        <View
          key={index}
          style={{
            width: 6,
            height: 1,
            backgroundColor: receiptColors.dash,
          }}
        />
      ))}
    </View>
  );
}

function Perforation() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
      {Array.from({ length: 18 }).map((_, index) => (
        <View
          key={index}
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: receiptColors.paperShadow,
          }}
        />
      ))}
    </View>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={[receiptTypography.metricLabel, { color: receiptColors.inkFaint }]}>
        {label}
      </Text>
      <Text style={[receiptTypography.metricValue, { color: receiptColors.ink }]}>
        {value}
      </Text>
    </View>
  );
}

function ReceiptAppRow({ line }: { line: ReceiptAppLine }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
      }}>
      <AppIconBadge
        packageName={line.packageName}
        appLabel={line.appLabel}
        size={28}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[receiptTypography.appName, { color: receiptColors.ink }]}
          numberOfLines={1}>
          {line.appLabel}
        </Text>
        <Text style={[receiptTypography.appMeta, { color: receiptColors.inkFaint }]}>
          进入 {line.visitCount} 次
        </Text>
      </View>
      <Text style={[receiptTypography.appMeta, { color: receiptColors.inkMuted, fontWeight: '700' }]}>
        {formatReceiptDuration(line.durationMs)}
      </Text>
    </View>
  );
}

function SectionBlock({ section }: { section: ReceiptCategorySection }) {
  const accent = getCategoryColor(section.category);

  return (
    <View style={{ marginTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: accent }} />
        <Text style={[receiptTypography.section, { color: receiptColors.inkMuted }]}>
          {section.label.toUpperCase()}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: receiptColors.dash, opacity: 0.6 }} />
      </View>
      {section.lines.map((line) => (
        <ReceiptAppRow key={line.packageName} line={line} />
      ))}
    </View>
  );
}

function WeekBarChart({ receipt }: { receipt: ShareReceipt }) {
  const maxMs = Math.max(...receipt.weekDays.map((day) => day.durationMs), 1);

  return (
    <View style={{ marginTop: 4 }}>
      <Text
        style={[
          receiptTypography.section,
          { color: receiptColors.inkFaint, marginBottom: 10 },
        ]}>
        每日亮屏
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 4,
          height: 52,
        }}>
        {receipt.weekDays.map((day) => {
          const ratio = day.durationMs / maxMs;
          const barHeight = Math.max(4, ratio * 40);
          const active = day.durationMs > 0;
          return (
            <View key={day.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: '100%',
                  height: barHeight,
                  borderRadius: 3,
                  backgroundColor: active ? receiptColors.brand : receiptColors.barEmpty,
                  opacity: active ? 0.45 + ratio * 0.55 : 0.35,
                }}
              />
              <Text style={[receiptTypography.weekLabel, { color: receiptColors.inkFaint }]}>
                {day.dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
      {receipt.weekTrendPercent !== null ? (
        <Text
          style={[
            receiptTypography.footer,
            { color: receiptColors.inkMuted, textAlign: 'center', marginTop: 8 },
          ]}>
          较上周 {receipt.weekTrendPercent > 0 ? '+' : ''}
          {receipt.weekTrendPercent}%
        </Text>
      ) : null}
    </View>
  );
}

function BarcodeDecoration({ kind }: { kind: ShareReceipt['kind'] }) {
  const footerLabel = kind === 'weekly' ? 'SPENDWHERE · WEEKLY RECEIPT' : 'SPENDWHERE · DAILY RECEIPT';

  return (
    <View style={{ alignItems: 'center', gap: 6, marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 36 }}>
        {[3, 2, 4, 2, 6, 3, 2, 5, 2, 4, 3, 6, 2, 4, 5, 2, 3, 4, 2, 6, 3, 2, 5, 4].map(
          (width, index) => (
            <View
              key={index}
              style={{
                width,
                height: index % 3 === 0 ? 36 : 28,
                backgroundColor: receiptColors.ink,
                opacity: index % 5 === 0 ? 1 : 0.75,
              }}
            />
          ),
        )}
      </View>
      <Text style={[receiptTypography.footer, { color: receiptColors.inkFaint, letterSpacing: 1 }]}>
        {footerLabel}
      </Text>
    </View>
  );
}

export const ReceiptShareCard = forwardRef<View, { receipt: ShareReceipt }>(
  function ReceiptShareCard({ receipt }, ref) {
    const isWeekly = receipt.kind === 'weekly';
    const metrics: Array<{ label: string; value: string }> = isWeekly
      ? [
          { label: '亮屏', value: formatReceiptDuration(receipt.activeInteractionMs) },
          { label: '解锁', value: `${receipt.unlockCount} 次` },
          { label: '有记录', value: `${receipt.activeDays} 天` },
          { label: '日均', value: formatReceiptDuration(receipt.avgActiveInteractionMs) },
        ]
      : [
          { label: '亮屏', value: formatReceiptDuration(receipt.activeInteractionMs) },
          { label: '解锁', value: `${receipt.unlockCount} 次` },
          { label: '会话', value: `${receipt.sessionCount} 次` },
        ];

    if (receipt.quickSessionCount > 0) {
      metrics.push({ label: '快看', value: `${receipt.quickSessionCount} 次` });
    }
    if (receipt.passiveMediaMs > 0) {
      metrics.push({ label: '后台', value: formatReceiptDuration(receipt.passiveMediaMs) });
    }

    const metricRows: Array<Array<{ label: string; value: string }>> = [];
    for (let i = 0; i < metrics.length; i += 2) {
      metricRows.push(metrics.slice(i, i + 2));
    }

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: RECEIPT_WIDTH,
          backgroundColor: receiptColors.paper,
          borderRadius: 4,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: receiptColors.paperShadow,
        }}>
        <Perforation />

        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <Text
            style={[
              receiptTypography.brand,
              { color: receiptColors.brand, textAlign: 'center' },
            ]}>
            SPENDWHERE
          </Text>
          <Text
            style={[
              receiptTypography.title,
              { color: receiptColors.ink, textAlign: 'center', marginTop: 6 },
            ]}>
            {isWeekly ? '周结小票' : '日结小票'}
          </Text>
          <Text
            style={[
              receiptTypography.date,
              { color: receiptColors.inkMuted, textAlign: 'center', marginTop: 4 },
            ]}>
            {receipt.periodLabel}
          </Text>

          <DashedRule />

          <Text
            style={[
              receiptTypography.section,
              { color: receiptColors.inkFaint, marginBottom: 10 },
            ]}>
            概览
          </Text>
          <View style={{ gap: 12 }}>
            {metricRows.map((row, rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: 'row', gap: 16 }}>
                {row.map((metric) => (
                  <MetricCell key={metric.label} label={metric.label} value={metric.value} />
                ))}
                {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>

          {isWeekly && receipt.weekDays.length > 0 ? (
            <>
              <DashedRule marginVertical={16} />
              <WeekBarChart receipt={receipt} />
            </>
          ) : null}

          {receipt.sections.length > 0 ? (
            <>
              <DashedRule marginVertical={16} />
              {receipt.sections.map((section) => (
                <SectionBlock key={section.category} section={section} />
              ))}
            </>
          ) : null}

          {receipt.others && receipt.others.appCount > 0 ? (
            <>
              <DashedRule marginVertical={14} />
              <View
                style={{
                  backgroundColor: receiptColors.highlight,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <Text style={[receiptTypography.others, { color: receiptColors.inkMuted }]}>
                  其他 · {receipt.others.appCount} 个 App
                </Text>
                <Text style={[receiptTypography.appMeta, { color: receiptColors.ink }]}>
                  {formatReceiptDuration(receipt.others.durationMs)} · {receipt.others.visitCount}次
                </Text>
              </View>
            </>
          ) : null}

          {receipt.topAppLabel ? (
            <View
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: receiptColors.dash,
                alignItems: 'center',
              }}>
              <Text style={[receiptTypography.footer, { color: receiptColors.inkFaint }]}>
                {isWeekly ? '本周最常使用' : '今日最常使用'}
              </Text>
              <Text
                style={[
                  receiptTypography.appName,
                  { color: receiptColors.brand, marginTop: 4, fontSize: 16 },
                ]}>
                {receipt.topAppLabel}
              </Text>
            </View>
          ) : null}

          <BarcodeDecoration kind={receipt.kind} />
        </View>

        <View
          style={{
            height: 8,
            backgroundColor: receiptColors.paperShadow,
            opacity: 0.5,
          }}
        />
      </View>
    );
  },
);
