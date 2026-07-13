import React, { forwardRef } from 'react';
import { Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ShareAchievement } from '../analysis/achievementShareFormatter';

const CARD_WIDTH = 360;

const RARITY_COLORS = {
  common: { accent: '#5E81AC', glow: '#5E81AC22' },
  rare: { accent: '#5B8DEF', glow: '#5B8DEF33' },
  epic: { accent: '#D9A441', glow: '#D9A44133' },
} as const;

const cardColors = {
  bg: '#1A1A1E',
  surface: '#242428',
  text: '#F2F2F5',
  textMuted: '#A8A8B0',
  textFaint: '#6E6E78',
  border: '#FFFFFF18',
  brand: '#5E81AC',
};

const cardTypography = {
  brand: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 2.2 },
  category: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.6 },
  name: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.4 },
  blurb: { fontSize: 14, fontWeight: '500' as const, lineHeight: 22 },
  metaLabel: { fontSize: 11, fontWeight: '500' as const },
  metaValue: { fontSize: 12, fontWeight: '700' as const },
  section: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8 },
  summary: { fontSize: 12, fontWeight: '500' as const, lineHeight: 18 },
  step: { fontSize: 13, fontWeight: '500' as const, lineHeight: 20 },
  footer: { fontSize: 10, fontWeight: '500' as const, letterSpacing: 1 },
  rarity: { fontSize: 10, fontWeight: '700' as const },
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[cardTypography.metaLabel, { color: cardColors.textFaint }]}>{label}</Text>
      <Text style={[cardTypography.metaValue, { color: cardColors.text }]}>{value}</Text>
    </View>
  );
}

function StoryStep({ label, accent, isLast }: { label: string; accent: string; isLast: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 14, alignItems: 'center' }}>
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: accent,
            marginTop: 6,
          }}
        />
        {!isLast ? (
          <View
            style={{
              width: 1,
              flex: 1,
              backgroundColor: cardColors.border,
              marginTop: 4,
              minHeight: 14,
            }}
          />
        ) : null}
      </View>
      <Text style={[cardTypography.step, { color: cardColors.text, flex: 1 }]}>{label}</Text>
    </View>
  );
}

export const AchievementShareCard = forwardRef<View, { payload: ShareAchievement }>(
  function AchievementShareCard({ payload }, ref) {
    const rarityStyle = RARITY_COLORS[payload.rarity];

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: CARD_WIDTH,
          backgroundColor: cardColors.bg,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: cardColors.border,
        }}>
        <View
          style={{
            height: 4,
            backgroundColor: rarityStyle.accent,
          }}
        />

        <View style={{ padding: 24, gap: 16 }}>
          <Text
            style={[
              cardTypography.brand,
              { color: cardColors.brand, textAlign: 'center' },
            ]}>
            SPENDWHERE
          </Text>

          <View style={{ alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: rarityStyle.glow,
                borderWidth: 1,
                borderColor: rarityStyle.accent + '55',
              }}>
              <Ionicons
                name={payload.icon as 'trophy-outline'}
                size={34}
                color={rarityStyle.accent}
              />
            </View>

            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[cardTypography.category, { color: rarityStyle.accent }]}>
                  {payload.categoryLabel}
                </Text>
                {payload.rarityLabel ? (
                  <View
                    style={{
                      backgroundColor: rarityStyle.glow,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                    }}>
                    <Text style={[cardTypography.rarity, { color: rarityStyle.accent }]}>
                      {payload.rarityLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[cardTypography.name, { color: cardColors.text, textAlign: 'center' }]}>
                {payload.name}
              </Text>
            </View>

            <Text
              style={[
                cardTypography.blurb,
                { color: cardColors.textMuted, textAlign: 'center' },
              ]}>
              {payload.blurb}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: cardColors.surface,
              borderRadius: 12,
              padding: 14,
              gap: 8,
              borderWidth: 1,
              borderColor: cardColors.border,
            }}>
            {payload.firstDateLabel ? (
              <MetaRow label="首次获得" value={payload.firstDateLabel} />
            ) : null}
            <MetaRow label="累计" value={payload.unlockCountLabel} />
          </View>

          {payload.hasStory ? (
            <View
              style={{
                backgroundColor: cardColors.surface,
                borderRadius: 12,
                padding: 14,
                gap: 10,
                borderWidth: 1,
                borderColor: cardColors.border,
              }}>
              <Text style={[cardTypography.section, { color: cardColors.textFaint }]}>
                最经典一次
              </Text>
              {payload.summary ? (
                <Text style={[cardTypography.summary, { color: cardColors.textMuted }]}>
                  {payload.summary}
                </Text>
              ) : null}
              {payload.steps.map((step, index) => (
                <StoryStep
                  key={`${step.label}-${index}`}
                  label={step.label}
                  accent={rarityStyle.accent}
                  isLast={index === payload.steps.length - 1}
                />
              ))}
            </View>
          ) : null}

          <Text
            style={[
              cardTypography.footer,
              { color: cardColors.textFaint, textAlign: 'center' },
            ]}>
            SPENDWHERE · ACHIEVEMENT
          </Text>
        </View>
      </View>
    );
  },
);
