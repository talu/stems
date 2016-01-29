/*!
 * Stems
 * Copyright(c) 2016 Meltmedia <mike@meltmedia.com>
 */

'use strict';


/**
 * # Reject a Request
 * This is only needed until Baucis adds the ability to limit collection/instance methods individually
 */
var RejectRequest = function RejectRequest() {

  return function rejectRequest(req, res/*, next*/) {
    res.status(405)
      .json({
        'status': 405,
        'name': 'Method Not Allowed',
        'message': 'The requested method has been disabled for this resource (405).'
      });
  };

};


module.exports = RejectRequest;
