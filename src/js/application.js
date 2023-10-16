import onChange from 'on-change';
import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import * as _ from 'lodash';

import render from './view.js';
import ru from './locales/ru.js';

const init = async () => {
  i18next
    .init({
      lng: 'ru',
      debug: true,
      resources: {
        ru,
      },
    })
    .then(() => {
      yup.setLocale({
        mixed: {
          required: i18next.t('forms.validation.required'),
          notOneOf: i18next.t('forms.validation.notUnique'),
        },
        string: {
          url: i18next.t('forms.validation.url'),
        },
      });
    });
};

const validate = async (url, state) => {
  const urlSchema = yup.string().required().url().notOneOf(state.data.urls);
  return urlSchema.validate(url, { abortEarly: false });
};

const parseFeed = (contents) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(contents, 'text/xml');
  console.log(xmlDoc);
  const feedTitle = xmlDoc.querySelector('channel > title').textContent;
  const feedDescription = xmlDoc.querySelector('channel > description').textContent;
  const feed = { title: feedTitle, description: feedDescription };
  const postElements = xmlDoc.querySelectorAll('item');
  const posts = [...postElements].map((element) => {
    const title = element.querySelector('title').textContent;
    const description = element.querySelector('description').textContent;
    const link = element.querySelector('link').textContent;
    const guid = element.querySelector('guid').textContent;
    const post = {
      title,
      description,
      link,
      guid,
    };
    return post;
  });
  return { feed, posts };
};

const addNewPosts = (posts, state) => {
  const newPosts = posts.filter((post) => _.findIndex(state.data.posts, { guid: post.guid }) < 0);
  state.data.posts.push(...newPosts);
};

const checkFeedsUpdate = (state) => {
  const promises = state.data.feeds.map((feed) =>
    axios
      .get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(feed.url)}`)
      .then((response) => {
        const { posts } = parseFeed(response.data.contents);
        addNewPosts(posts, state);
      })
      .catch((error) => {
        console.log(error);
      })
  );
  return Promise.all(promises);
};

const app = () => {
  const state = {
    data: {
      currentUrl: '',
      urls: [],
      feeds: [],
      posts: [],
    },
    error: null,
    status: '',
  };

  const watchedState = onChange(state, (path, current, previous) => render(watchedState, path, current, previous, i18next));

  const form = document.querySelector('form');
  const inputElement = document.querySelector('input');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const { value } = inputElement;
    watchedState.data.currentUrl = value;
    validate(value, watchedState)
      .then(() => {
        console.log(`valid currentUrl = ${value}`);
        watchedState.error = null;
        watchedState.status = 'sending';
        axios
          .get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(watchedState.data.currentUrl)}`)
          .then((response) => {
            const { feed, posts } = parseFeed(response.data.contents);
            feed.url = watchedState.data.currentUrl;
            watchedState.data.urls = [...watchedState.data.urls, value];
            watchedState.data.feeds = [...watchedState.data.feeds, feed];
            addNewPosts(posts, watchedState);
            watchedState.data.currentUrl = '';
            watchedState.status = 'ready';
          })
          .catch((error) => {
            console.log(error);
            switch (error.name) {
              case 'TypeError':
                watchedState.error = i18next.t('errors.invalidXml');
                break;
              case 'AxiosError':
                watchedState.error = i18next.t('errors.network');
                break;
              default:
                watchedState.error = i18next.t('errors.unexpected');
            }
            watchedState.status = 'ready';
          });
      })
      .catch((error) => {
        console.log(`set watchedState.error = ${error}`);
        [watchedState.error] = error.errors;
      });
  });
  const fetchFeeds = () => {
    console.log('checkFeedsUpdate');
    checkFeedsUpdate(watchedState).then(() => setTimeout(fetchFeeds, 5000));
  };

  setTimeout(fetchFeeds, 5000);
};

export default () => {
  init().then(() => app());
};
