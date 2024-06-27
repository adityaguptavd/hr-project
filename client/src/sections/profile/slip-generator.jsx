import React, { useRef } from 'react';
import ReactToPrint from 'react-to-print';
import { Button } from '@mui/material';
import Slip from 'src/components/slip';
import PropTypes from 'prop-types';

const App = ({id, name, employeeId, department}) => {
  const componentRef = useRef();

  return (
    <div>
      <Slip ref={componentRef} id={id} name={name} employeeId={employeeId} department={department} />
      <ReactToPrint
        trigger={() => (
          <Button sx={{ marginTop: '30px', fontSize: '17px' }}>Download</Button>
        )}
        content={() => componentRef.current}
      />
    </div>
  );
};

export default App;

App.propTypes = {
  id: PropTypes.any,
  employeeId: PropTypes.any,
  name: PropTypes.string,
  department: PropTypes.string,
};