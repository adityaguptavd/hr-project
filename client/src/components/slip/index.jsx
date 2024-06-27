import React, { forwardRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Stack, Typography } from '@mui/material';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useFetchEmployeeSummaryQuery } from 'src/state/api/employee';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import DenseTable from './table';

const Slip = forwardRef((props, ref) => {
  const token = useSelector(state => state.user.token);
  const [date, setDate] = useState(dayjs(new Date()));
  const [prevMonthYear, setPrevMonthYear] = useState(date);

  const { data } = useFetchEmployeeSummaryQuery({token, id: props.id, month: prevMonthYear.month(), year: prevMonthYear.year()});

  useEffect(() => {
    let temp = date.clone();
    if (temp.month() === 0) {
      temp = temp.subtract(1, 'year').month(11);
    } else {
      temp = temp.subtract(1, 'month');
    }
    setPrevMonthYear(temp);
  }, [date]);

  return (
    <div ref={ref} style={{ padding: '20px' }}>
      <Stack direction="column" alignItems="flex-start" spacing={2}>
        <Typography variant="h4" gutterBottom alignSelf="center">
          Company Name
        </Typography>
        <Typography variant="h5" gutterBottom alignSelf="center">
          Salary Slip of{' '}
          {`${prevMonthYear.format('MMM YYYY')}`}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Employee ID : </Typography>
          <Typography variant="body2">{props.employeeId}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Employee Name : </Typography>
          <Typography variant="body2">{props.name}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Department : </Typography>
          <Typography variant="body2">{props.department}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DemoContainer components={['DatePicker']}>
              <DatePicker
                format="DD/MM/YYYY"
                label="Date"
                value={date}
                onChange={(newDate) => {
                  setDate(newDate);
                }}
              />
            </DemoContainer>
          </LocalizationProvider>
        </Stack>
        <DenseTable data={data ? data.attendanceSummary : null} salary={data ? data.user.salary : 0} />
      </Stack>
    </div>
  );
});

export default Slip;

Slip.propTypes = {
  id: PropTypes.any,
  employeeId: PropTypes.any,
  name: PropTypes.string,
  department: PropTypes.string,
};
