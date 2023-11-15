/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["watchedState"] }] */
import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import * as _ from 'lodash';

import watch from './view.js';
import parse from './parse.js';
import resources from './ru.js';

const init = async () => {
  const i18nextInstance = i18next.createInstance();
  await i18nextInstance.init({
    lng: 'ru',
    debug: true,
    resources,
  });
  return i18nextInstance;
};

const validate = async (url, urls) => {
  const urlSchema = yup.string().required('forms.validation.required').url('forms.validation.url').notOneOf(urls, 'forms.validation.notUnique');
  return urlSchema.validate(url, { abortEarly: false });
};

const addNewPosts = (posts, state) => {
  const newPosts = posts.filter((post) => _.findIndex(state.data.posts, { guid: post.guid }) < 0);
  state.data.posts.push(...newPosts);
};

const getUrlWithProxy = (url) => {
  const urlWithProxy = new URL('/get', 'https://allorigins.hexlet.app');
  urlWithProxy.searchParams.set('url', url);
  urlWithProxy.searchParams.set('disableCache', 'true');
  return urlWithProxy.toString();
};

const getFeed = (url) => {
  const urlWithProxy = getUrlWithProxy(url);
  return axios.get(urlWithProxy).catch((error) => {
    switch (error.name) {
      case 'AxiosError':
        throw new Error('errors.network');
      default:
        throw new Error('errors.unexpected');
    }
  });
};

const buildInitialState = () => {
  const state = {
    data: {
      feeds: [],
      posts: [],
    },
    seenGuids: [],
    currentGuid: null,
    errorMessage: null,
    addFeedStatus: 'ready',
  };
  return state;
};

const markPostSeen = (guid, watchedState) => {
  if (!watchedState.seenGuids.includes(guid)) {
    watchedState.seenGuids.push(guid);
  }
};

const buildUiRefs = () => {
  const ui = {
    inputElement: document.querySelector('#input'),
    addbuttonElement: document.querySelector('#addbutton'),
    feedback: document.querySelector('#feedback'),
    feedsContainer: document.querySelector('#feeds'),
    postsContainer: document.querySelector('#posts'),
    modal: document.querySelector('#modal'),
  };
  return ui;
};

const app = (i18nextInstance) => {
  const state = buildInitialState();
  const elements = buildUiRefs();
  const watchedState = watch(elements, state, i18nextInstance);
  const exampleModal = document.querySelector('#modal');
  exampleModal.addEventListener('show.bs.modal', (event) => {
    const button = event.relatedTarget;
    const guid = button.getAttribute('data-bs-guid');
    watchedState.currentGuid = guid;
    markPostSeen(guid, watchedState);
  });
  const form = document.querySelector('form');
  form.addEventListener('submit', (event) => {
    watchedState.addFeedStatus = 'processing';
    event.preventDefault();
    const formData = new FormData(form);
    const url = formData.get('urlInput');
    const urls = watchedState.data.feeds.map((feed) => feed.url);
    validate(url, urls)
      .then(() => {
        getFeed(url)
          .then((response) => {
            const { feed, posts } = parse(response.data.contents);
            feed.url = url;
            watchedState.data.feeds.push(feed);
            addNewPosts(posts, watchedState);
            watchedState.addFeedStatus = 'ready';
          })
          .catch((error) => {
            watchedState.errorMessage = error.message;
            watchedState.addFeedStatus = 'error';
          });
      })
      .catch((validationError) => {
        [watchedState.errorMessage] = validationError.errors;
        watchedState.addFeedStatus = 'error';
      });
  });

  const postsContainer = document.querySelector('#posts');
  postsContainer.addEventListener('click', (event) => {
    if (event.target.tagName.toLowerCase() === 'a') {
      const button = event.target.nextSibling;
      const guid = button.getAttribute('data-bs-guid');
      markPostSeen(guid, watchedState);
    }
  });

  const repeatIntervalMs = 5000;
  const fetchFeeds = () => {
    const promises = watchedState.data.feeds
      .map((feed) => getFeed(feed.url)
        .then((response) => {
          const { posts } = parse(response.data.contents);
          addNewPosts(posts, watchedState);
        }).catch((error) => {
          console.log(error);
        }));
    Promise.all(promises)
      .finally(() => setTimeout(fetchFeeds, repeatIntervalMs));
  };
  setTimeout(fetchFeeds, repeatIntervalMs);
};

export default () => {
  init().then((i18nextInstance) => app(i18nextInstance));
};
