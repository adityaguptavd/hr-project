/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
/* eslint-disable object-shorthand */
/* eslint-disable arrow-body-style */

import React, { useState, useEffect } from 'react';
import MenuItem from '@mui/material/MenuItem';
import { Paper, useTheme, Stack, Typography, Divider, Box } from '@mui/material';
import { ClickAwayListener } from '@mui/base';

import './app-calender.css';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment-timezone';
import { useSelector } from 'react-redux';

import { fDate } from 'src/utils/format-time';
import dayjs from 'dayjs';
import { addDays, startOfDay } from 'date-fns';
import {
  useAddAttendanceMutation,
  useFetchAttendanceQuery,
  useSwitchAttendanceStatusMutation,
} from 'src/state/api/attendance';
import DialogBox from './dialog-box';

// Create a localizer
const localizer = momentLocalizer(moment);

const CalendarComponent = ({ id, setSnackbar, refetchUser, setMonthYear, month, year }) => {
  const theme = useTheme();
  const token = useSelector((state) => state.user.token);
  const user = useSelector((state) => state.user.user);

  const { data, refetch } = useFetchAttendanceQuery({ token, id, month, year });

  const [addAttendanceMutation, { data: added, error: notAdded }] = useAddAttendanceMutation();

  const [switchAttendanceStatusMutation, { data: success, error }] =
    useSwitchAttendanceStatusMutation();

  const [events, setEvents] = useState([]);

  const [open, setOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState({});
  const [slotSelected, setSlotSelected] = useState({});
  const [newStatus, setNewStatus] = useState('');

  const handleEventSelect = (eventSelected) => {
    if (user.role === 'HR' && eventSelected.title !== 'Weekend') {
      setSelectedEvent(eventSelected);
      setOpen(true);
    }
  };

  const closePopup = () => {
    setOpen(false);
    setSlotSelected({});
    setSelectedEvent({});
  };

  const handleDateSelect = (slotInfo) => {
    if (user.role === 'HR') {
      const { start, end } = slotInfo;
      const eventsForThisDay = events.filter((event) => event.start >= start && event.start < end);
      if (eventsForThisDay.length > 0) {
        if(eventsForThisDay[0].title === 'Weekend'){
          return;
        }
        setSelectedEvent(eventsForThisDay[0]);
      } else {
        setSlotSelected(slotInfo);
      }
      setOpen(true);
    }
  };

  const getUserConfirmation = (confirm) => {
    setOpen(false);
    setOpenDialog(false);
    if (!confirm) {
      setSelectedEvent({});
      setSlotSelected({});
      return;
    }
    if (Object.keys(slotSelected).length !== 0) {
      // it means requested for new event
      const body = JSON.stringify({
        status: newStatus,
        date: dayjs(slotSelected.start).format(),
      });
      addAttendanceMutation({ token, body, id });
      setSlotSelected({});
      return;
    }
    // otherwise update the event status
    if (newStatus !== selectedEvent.status) {
      const body = JSON.stringify({
        status: newStatus,
      });
      switchAttendanceStatusMutation({ body, token, id: selectedEvent.id });
    }
    setSelectedEvent({});
  };

  useEffect(() => {
    if (newStatus !== '') {
      setOpenDialog(true);
    }
  }, [newStatus]);

  const eventStyleGetter = (event) => {
    const backgroundColor =
      event.title === 'Present' ||
      event.title === 'Holiday' ||
      (event.title === 'Weekend' && !event.status)
        ? theme.palette.success.main
        : theme.palette.error.main; // Using Material Design color codes
    const style = {
      backgroundColor,
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: 'none',
      display: 'block',
      padding: '2px 5px',
      textAlign: 'center',
    };
    return {
      style: style,
    };
  };

  useEffect(() => {
    if (data) {
      const attendance = data.attendance
        .filter((item) => {
          const date = moment(item.date).tz(moment.tz.guess());
          return date.day() !== 5 && date.day() !== 6;
        })
        .map((item) => {
          const allDayEvents = ['Present', 'Holiday'];
          const date = moment(item.date).tz(moment.tz.guess());
          return {
            id: item._id,
            title: item.status,
            status: item.status,
            start: date.toDate(), // Use the first time or just the date
            end: date.toDate(),
            allDay: allDayEvents.includes(item.status),
          };
        });

      // Calculate the first day of the month
      const firstDate = new Date();
      firstDate.setFullYear(year, month, 1);
      const firstDayOfWeek = firstDate.getDay();

      // Function to find all occurrences of a specific weekday in a month
      const findAllWeekdaysInMonth = (weekday) => {
        const dates = [];
        let date = new Date(firstDate);

        // Adjust the date to the first occurrence of the desired weekday
        const diff = (weekday + 7 - firstDayOfWeek) % 7;
        date = addDays(date, diff);

        // Iterate through the month to find all occurrences of the weekday
        while (date.getMonth() === month) {
          dates.push(startOfDay(date));
          date = addDays(date, 7); // Move to the next week
        }

        return dates;
      };

      // Find all Saturdays and Sundays in the month
      const saturdaysThisMonth = findAllWeekdaysInMonth(6); // 6 represents Saturday
      const fridaysThisMonth = findAllWeekdaysInMonth(5); // 5 represents Friday

      // Create events for all Saturdays and Sundays
      const weekendEvents = [
        ...saturdaysThisMonth.map((date) => ({
          title: 'Weekend',
          start: date,
          end: date,
          allDay: true,
        })),
        ...fridaysThisMonth.map((date) => ({
          title: 'Weekend',
          start: date,
          end: date,
          allDay: true,
        })),
      ];

      // Update events
      setEvents([...attendance, ...weekendEvents]);
    }
  }, [data, month, year]);

  useEffect(() => {
    if (error) {
      let mssg = '';
      if (error.status === 'FETCH_ERROR') {
        mssg = 'Server is not responding!';
      } else {
        mssg = error.data.error;
      }
      setSnackbar({
        open: true,
        mssg,
        bgColor: theme.palette.error.dark,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
      });
      console.error(error);
    }
    if (success) {
      setNewStatus('');
      refetch();
      setSnackbar({
        open: true,
        mssg: 'Status Updated',
        bgColor: theme.palette.success.dark,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
      });
      refetchUser();
    }
  }, [success, error, theme, setSnackbar, refetch, refetchUser]);

  useEffect(() => {
    if (notAdded) {
      let mssg = '';
      if (notAdded.status === 'FETCH_ERROR') {
        mssg = 'Server is not responding!';
      } else {
        mssg = notAdded.data.error;
      }
      setSnackbar({
        open: true,
        mssg,
        bgColor: theme.palette.error.dark,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
      });
      console.error(notAdded);
    }
    if (added) {
      setNewStatus('');
      refetch();
      setSnackbar({
        open: true,
        mssg: 'New Attendance Added',
        bgColor: theme.palette.success.dark,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
      });
      refetchUser();
    }
  }, [added, notAdded, theme, setSnackbar, refetch, refetchUser]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Calendar
        localizer={localizer}
        events={events}
        // showMultiDayTimes={false}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        eventPropGetter={eventStyleGetter}
        selectable
        longPressThreshold={0}
        onSelectEvent={handleEventSelect}
        onSelectSlot={handleDateSelect}
        onNavigate={(date) => {
          setMonthYear({
            month: date.getMonth(),
            year: date.getFullYear(),
          });
        }}
      />
      {open && (
        <ClickAwayListener onClickAway={closePopup}>
          <Paper
            sx={{
              position: 'absolute',
              top: '40%',
              left: '30%',
              p: 0,
              mt: 1,
              ml: 0.75,
              width: '300px',
              opacity: 1,
              zIndex: 99,
              backgroundColor: '#f1f1f1',
            }}
          >
            <Stack m={2}>
              <Typography variant="h4">
                {fDate(selectedEvent.start || slotSelected.start, 'dd MMM yyyy')}
              </Typography>
              <Typography variant="body2">{selectedEvent.status || ''}</Typography>
              <Divider sx={{ borderStyle: 'dashed', m: 0 }} />
              <MenuItem
                value="Present"
                onClick={() => setNewStatus('Present')}
                sx={{ marginTop: '10px' }}
              >
                Present
              </MenuItem>
              <MenuItem value="Half Day" onClick={() => setNewStatus('Half Day')}>
                Half Day
              </MenuItem>
              <MenuItem value="Absent" onClick={() => setNewStatus('Absent')}>
                Absent
              </MenuItem>
              <MenuItem value="Medical Leave" onClick={() => setNewStatus('Medical Leave')}>
                Medical Leave
              </MenuItem>
              <MenuItem value="Casual Leave" onClick={() => setNewStatus('Casual Leave')}>
                Casual Leave
              </MenuItem>
              <MenuItem value="Holiday" onClick={() => setNewStatus('Holiday')}>
                Holiday
              </MenuItem>
              {selectedEvent.status && (
                <MenuItem value="Remove" onClick={() => setNewStatus('Remove')}>
                  Remove Attendance
                </MenuItem>
              )}
            </Stack>
          </Paper>
        </ClickAwayListener>
      )}
      <DialogBox
        open={openDialog}
        title="Confirm?"
        desc={
          selectedEvent.status
            ? `Change status from ${selectedEvent.status} to ${newStatus}?`
            : `Add new status '${newStatus}'`
        }
        getUserConfirmation={getUserConfirmation}
      />
    </Box>
  );
};

const AppCalender = (props) => {
  return (
    <div>
      <h1>Attendance Calendar</h1>
      <CalendarComponent {...props} />
    </div>
  );
};

export default AppCalender;
