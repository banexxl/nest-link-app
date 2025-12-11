// app/main/calendar.tsx
import BackgroundScreen from '@/components/layouts/background-screen';
import { useAuth } from '@/context/auth-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { PRIMARY_COLOR, styles } from './styles';
import { CalendarEvent, fetchCalendarEvents, resolveCalendarBuilding } from './server-actions';

type EventsByDate = Record<string, CalendarEvent[]>;

// Local type for react-native-calendars day press
type CalendarDay = {
  dateString: string; // "2025-01-20"
  day: number;
  month: number;
  year: number;
  timestamp: number;
};

// Local type for markedDates prop
type MarkedDatesType = {
  [date: string]: {
    selected?: boolean;
    marked?: boolean;
    dotColor?: string;
    selectedColor?: string;
    disabled?: boolean;
  };
};

const CalendarScreen: React.FC = () => {
  const { session } = useAuth();
  const authUserId = session?.user.id ?? null;
  const { height: screenHeight } = useWindowDimensions();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { handleScroll } = useTabBarScroll();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [buildingId, setBuildingId] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (showLoading = true) => {
      if (!buildingId) return;

      if (showLoading) setLoading(true);
      setError(null);
      try {
        const { events: fetchedEvents, error: fetchError } =
          await fetchCalendarEvents(buildingId);

        if (fetchError) {
          setError(fetchError);
          setEvents([]);
        } else {
          setEvents(fetchedEvents);
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load events.');
        setEvents([]);
      } finally {
        if (showLoading) setLoading(false);
        setRefreshing(false);
      }
    },
    [buildingId]
  );

  useEffect(() => {
    if (buildingId) {
      fetchEvents(true);
    }
  }, [buildingId, fetchEvents]);

  // Resolve tenant's building for filtering events
  useEffect(() => {
    const loadBuilding = async () => {
      if (!authUserId) {
        setError('You must be signed in to view calendar events.');
        setLoading(false);
        return;
      }

      try {
        const { buildingId: resolvedBuildingId, error: buildingError } =
          await resolveCalendarBuilding(authUserId);

        if (!resolvedBuildingId) {
          setError(buildingError ?? 'Unable to determine building for this tenant.');
          setBuildingId(null);
          setLoading(false);
          return;
        }

        setBuildingId(resolvedBuildingId);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to resolve building for this tenant.');
        setBuildingId(null);
        setLoading(false);
      }
    };

    loadBuilding();
  }, [authUserId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEvents(false);
  };

  const eventsByDate: EventsByDate = useMemo(() => {
    const map: EventsByDate = {};
    events.forEach((evt) => {
      if (!evt.start_date_time) return;
      const dateKey = new Date(evt.start_date_time).toISOString().slice(0, 10); // YYYY-MM-DD

      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(evt);
    });
    return map;
  }, [events]);

  const markedDates: MarkedDatesType = useMemo(() => {
    const marks: MarkedDatesType = {};

    Object.keys(eventsByDate).forEach((date) => {
      const isSelected = date === selectedDate;

      marks[date] = {
        selected: isSelected,
        selectedColor: PRIMARY_COLOR,
        marked: true,
        dotColor: PRIMARY_COLOR,
      };
    });

    if (!marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: PRIMARY_COLOR,
      };
    } else {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: PRIMARY_COLOR,
      };
    }

    return marks;
  }, [eventsByDate, selectedDate]);

  const handleDayPress = (day: CalendarDay) => {
    setSelectedDate(day.dateString);
  };

  const selectedDayEvents = eventsByDate[selectedDate] ?? [];
  const hasEvents = selectedDayEvents.length > 0;
  const eventsMaxHeight = useMemo(() => Math.max(screenHeight * 0.45, 260), [screenHeight]);

  const renderEvent = ({ item }: { item: CalendarEvent }) => {
    const start = item.start_date_time ? new Date(item.start_date_time) : null;
    const end = item.end_date_time ? new Date(item.end_date_time) : null;

    const timeLabel = item.all_day
      ? 'All day'
      : start
        ? `${start.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}${end
          ? ` – ${end.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`
          : ''
        }`
        : '';

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeaderRow}>
          <Text style={styles.eventTitle}>{item.title || 'Untitled event'}</Text>
          {item.calendar_event_type ? (
            <View style={styles.eventTypePill}>
              <Text style={styles.eventTypeText}>
                {item.calendar_event_type}
              </Text>
            </View>
          ) : null}
        </View>
        {timeLabel ? <Text style={styles.eventTime}>{timeLabel}</Text> : null}
        {item.description ? (
          <Text style={styles.eventDescription}>{item.description}</Text>
        ) : null}
      </View>
    );
  };

  if (error) {
    return (
      <BackgroundScreen>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </BackgroundScreen>
    );
  }

  return (
    <BackgroundScreen>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <Text style={styles.headerMeta}>{events.length} events</Text>
      </View>

      <View style={styles.calendarCard}>
        <Calendar
          current={selectedDate}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: PRIMARY_COLOR,
            selectedDayTextColor: '#ffffff',
            todayTextColor: PRIMARY_COLOR,
            arrowColor: PRIMARY_COLOR,
            dotColor: PRIMARY_COLOR,
            textDayFontFamily: 'System',
            textMonthFontFamily: 'System',
            textDayHeaderFontFamily: 'System',
          }}
          style={styles.calendar}
        />
      </View>

      <View style={[styles.eventsCard, { maxHeight: eventsMaxHeight }]}>
        <View style={styles.eventsHeaderRow}>
          <Text style={styles.eventsHeaderTitle}>
            {hasEvents
              ? `Events on ${selectedDate} (${selectedDayEvents.length})`
              : `No events on ${selectedDate}`}
          </Text>
        </View>

        {hasEvents ? (
          <FlatList
            data={selectedDayEvents}
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
            contentContainerStyle={{ paddingBottom: 4 }}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ maxHeight: eventsMaxHeight - 28 }}
            showsVerticalScrollIndicator={selectedDayEvents.length > 3}
          />
        ) : (
          <ScrollView
            contentContainerStyle={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ maxHeight: eventsMaxHeight - 28 }}
          >
            <Text style={styles.emptyText}>
              Tap another day in the calendar to see its events.
            </Text>
          </ScrollView>
        )}
      </View>
    </BackgroundScreen>
  );
};

export default CalendarScreen;
