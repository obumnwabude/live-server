/**
 * Returns the current date as a string in the format DD-MM-YYYY
 * @author Obumuneme Nwabude
 * @return {string} The current date in the format DD-MM-YYYY
 */
const getDate = () => {
  // get the current date 
  let dates = (new Intl.DateTimeFormat('en-GB')).format(new Date()).split('/');

  // ensure that the day and month are two digits long
  if (dates[0].length === 1) dates[0] = '0' + dates[0];
  if (dates[1].length === 1) dates[1] = '0' + dates[1];

  // rearrange the date order from MM-DD to DD-MM
  const hold = dates[1];
  dates[1] = dates[0];
  dates[0] = hold;

  // return the date, formatted as required
  return dates.join('-');
};

/**
 * Returns the current time as a string in the format HH:MMam/pm
 * @author Obumuneme Nwabude
 * @return {string} The current time in the format HH:MMam/pm
 */
const getTime = () => {
  // get the current time 
  const times = (new Intl.DateTimeFormat('en', {
    hour:'numeric', 
    minute:'numeric'
  })).format(new Date()).split(' ');

  // modify the am pm portion of the timeString
  times[1] = times[1].toLowerCase();

  // ensure the hour is two digits long
  const times1 = times[0].split(':');
  if (times1[0].length === 1) times1[0] = '0' + times1[0];
  times[0] = times1.join(':');

  // return the time, formatted as required
  return times.join('');
};

/**
 * Returns date and time as a string in the format DD-MM-YYYY-HH:MMam/pm
 * @author Obumuneme Nwabude
 * @return {string} The current date and time 
 */
module.exports = () => `${getDate()}-${getTime()}`;