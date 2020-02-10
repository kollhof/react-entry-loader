/* eslint-env node */
import React from 'react';

import {render} from 'react-entry-loader/render';
import {Module, Styles, Scripts} from 'react-entry-loader/injectors';

import App from './app';
import GeneratedCode from './code-gen';


const Html = ({scripts, styles, title})=> (
  <html>
    <head>
      <title>{title}</title>
      <meta
        httpEquiv="Content-Security-Policy"
        content="default-src 'self'; style-src 'self' 'unsafe-inline'"
      />
      <Styles files={styles} />
      <Scripts files={scripts} async />
    </head>
    <body>
      <div id="page1-app">
        <Module onLoad={render('page1-app')}>
          <App page="1" />
        </Module>
      </div>

      <GeneratedCode filename={__filename} />
    </body>
  </html>
);

export default Html;
