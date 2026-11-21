import type { ChefCard } from '@senzo/api-client';
import { ChefFig, initialsOf, lookFor } from '@senzo/ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const SWIPE_PX = 40;

function Bob({ children }: { children: React.ReactNode }) {
  const y = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!reduced) y.value = withRepeat(withTiming(-5, { duration: 1400 }), -1, true);
  }, [reduced, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** G04 line-up: the active chef in front, neighbours smaller behind. Swipe or tap a side chef. */
export function LineUp({
  chefs,
  active,
  onChange,
  onOpen,
}: {
  chefs: ChefCard[];
  active: number;
  onChange: (index: number) => void;
  onOpen: (chef: ChefCard) => void;
}) {
  const { t } = useTranslation();
  const n = chefs.length;
  const go = (i: number) => onChange((i + n) % n);

  const swipe = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onEnd((e) => {
      if (e.translationX > SWIPE_PX) scheduleOnRN(go, active - 1);
      else if (e.translationX < -SWIPE_PX) scheduleOnRN(go, active + 1);
    });

  if (n === 0) return null;
  const slots =
    n === 1
      ? [0]
      : n === 2
        ? [active, (active + 1) % n]
        : [-1, 0, 1].map((o) => (active + o + n) % n);

  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.row} accessibilityRole="adjustable">
        {slots.map((i) => {
          const chef = chefs[i]!;
          const front = i === active;
          const fig = (
            <ChefFig
              look={lookFor(chef.id)}
              initials={initialsOf(chef.displayName)}
              width={front ? 150 : 105}
            />
          );
          return (
            <Pressable
              key={chef.id}
              onPress={() => (front ? onOpen(chef) : go(i))}
              accessibilityRole="button"
              accessibilityLabel={
                front ? chef.displayName : t('home.show', { name: chef.displayName })
              }
              style={front ? styles.front : styles.side}
            >
              {front ? <Bob>{fig}</Bob> : fig}
            </Pressable>
          );
        })}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', minHeight: 330 },
  front: { zIndex: 2, marginHorizontal: -20 },
  side: { opacity: 0.8, marginBottom: 30 },
});
