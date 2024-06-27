/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useSelector } from 'react-redux';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Popover from '@mui/material/Popover';
import { ClickAwayListener } from '@mui/base';
import PropTypes from 'prop-types';

import { fDate } from 'src/utils/format-time';
import SlipGenerator from './slip-generator';

export default function UserSummaryView({ summary, id, employeeId, name, department }) {
  const user = useSelector((state) => state.user.user);

  const [open, setOpen] = useState(false);

  const closePopup = () => {
    setOpen(null);
  };

  const getLeavesByStatus = () => {
    const leave = {
      Approved: 0,
      Rejected: 0,
      Pending: 0,
    };
    if (summary && summary.leaveSummary) {
      summary.leaveSummary.forEach((each) => {
        leave[each._id] = each.total;
      });
    }
    return leave;
  };

  const getAttendanceByStatus = () => {
    const attendance = {
      Present: 0,
      Absent: 0,
      Holiday: 0,
      'Half Day': 0,
      'Medical Leave': 0,
      'Casual Leave': 0,
    };
    if (summary && summary.status) {
      summary.status.forEach((each) => {
        attendance[each._id] = each.total;
      });
    }
    return attendance;
  };

  const { Approved, Rejected, Pending } = getLeavesByStatus();
  const attendance = getAttendanceByStatus();
  const { Present, Absent, Holiday } = attendance;
  const halfDay = attendance['Half Day'];
  const onLeave = attendance['Medical Leave'] + attendance['Casual Leave'];

  return summary ? (
    <Card
      sx={{
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        flexGrow: 1,
      }}
    >
      <Typography variant="h4">Summary</Typography>
      <Grid container spacing={{ xs: 3, sm: 2, md: 1 }}>
        {(user.role === 'HR' || user._id === id) && (
          <Grid item xs={12} sm={6} md={4}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Base Salary: </Typography>
              <Typography variant="body2">{summary.salary.base.toFixed(2)}</Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Effective Salary: </Typography>
              <Typography variant="body2">
                {summary.attendanceSummary.length > 0
                  ? (
                      summary.salary.base.toFixed(2) -
                      summary.attendanceSummary[0].deductions.toFixed(2)
                    ).toFixed(2)
                  : 0}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Deductions: </Typography>
              <Typography variant="body2">
                {summary.attendanceSummary.length > 0
                  ? summary.attendanceSummary[0].deductions.toFixed(2)
                  : 0}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Last Updated: </Typography>
              <Typography variant="body2">
                {summary.salary.lastUpdated
                  ? fDate(summary.salary.lastUpdated, 'dd/MM/yyyy')
                  : 'No payment yet!'}
              </Typography>
            </Stack>
            <Button sx={{ marginTop: '30px', fontSize: '17px' }} onClick={(e) => setOpen(e.target)}>
              View Receipt
            </Button>
            {open && (
              <ClickAwayListener onClickAway={closePopup}>
                <Popover
                  open={!!open}
                  anchorEl={open}
                  onClose={closePopup}
                  anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  PaperProps={{
                    sx: {
                      width: '600px',
                      padding: '20px'
                    },
                  }}
                >
                  <SlipGenerator id={id} name={name} employeeId={employeeId} department={department} />
                </Popover>
              </ClickAwayListener>
            )}
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={4}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Leaves Applied: </Typography>
            <Typography variant="body2">{Approved + Pending + Rejected}</Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Leaves Approved: </Typography>
            <Typography variant="body2">{Approved}</Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Leaves Pending: </Typography>
            <Typography variant="body2">{Pending}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">Leaves Rejected: </Typography>
            <Typography variant="body2">{Rejected}</Typography>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Present: </Typography>
            <Typography variant="body2">{Present} days</Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Absent: </Typography>
            <Typography variant="body2">{Absent} days</Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Half Day: </Typography>
            <Typography variant="body2">{halfDay} days</Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">On Leave: </Typography>
            <Typography variant="body2">{onLeave} days</Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Holiday: </Typography>
            <Typography variant="body2">{Holiday} days</Typography>
          </Stack>
        </Grid>
      </Grid>
    </Card>
  ) : (
    <Typography variant="h3">Loading Summary...</Typography>
  );
}

UserSummaryView.propTypes = {
  summary: PropTypes.any,
  id: PropTypes.any,
  employeeId: PropTypes.any,
  name: PropTypes.string,
  department: PropTypes.string,
};
