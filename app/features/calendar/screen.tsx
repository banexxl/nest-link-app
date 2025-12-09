// app/main/calendar.tsx
import { supabase } from '@/lib/supabase';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

const PRIMARY_COLOR = '#f68a00';

type CalendarEvent = {
  id: string;
  title: string | null;
  description: string | null;
  all_day: boolean;
  start_date_time: string; // ISO from Supabase
  end_date_time: string | null;
  calendar_event_type: string | null;
  building_id: string | null;
};

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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('tblCalendarEvents')
          .select(
            `
            id,
            title,
            description,
            all_day,
            start_date_time,
            end_date_time,
            calendar_event_type,
            building_id
          `
          )
          .order('start_date_time', { ascending: true });

        if (error) {
          console.log('Error fetching calendar events:', error);
          setError(error.message);
          setEvents([]);
        } else {
          setEvents((data ?? []) as CalendarEvent[]);
        }
      } catch (err: any) {
        console.log('Unexpected error fetching calendar events:', err);
        setError(err?.message ?? 'Failed to load events.');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

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
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
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

      <View style={styles.eventsContainer}>
        <View style={styles.eventsHeaderRow}>
          <Text style={styles.eventsHeaderTitle}>
            {selectedDayEvents.length > 0
              ? `Events on ${selectedDate} (${selectedDayEvents.length})`
              : `No events on ${selectedDate}`}
          </Text>
        </View>

        {selectedDayEvents.length > 0 ? (
          <FlatList
            data={selectedDayEvents}
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        ) : (
          <ScrollView
            contentContainerStyle={{
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
            }}
          >
            <Text style={styles.emptyText}>
              Tap another day in the calendar to see its events.
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default CalendarScreen;

const styles = StyleSheet.create({
  root: {
    marginTop: 30,
    flex: 1,
    backgroundColor: '#f4f4f7',
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  eventsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  eventsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventsHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  eventCard: {
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 1,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  eventTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(246,138,0,0.12)',
  },
  eventTypeText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: '#333',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#d00',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});
