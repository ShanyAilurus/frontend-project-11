/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["element"] }] */
import * as _ from 'lodash';
import onChange from 'on-change';

const watch = (ui, state, i18next) => {
  const renderFeeds = (feeds, feedsContainer) => {
    const list = document.createElement('ul');
    const elements = feeds.map((feed) => {
      const liElement = document.createElement('li');
      const h3Element = document.createElement('h3');
      const pElement = document.createElement('p');
      h3Element.textContent = feed.title;
      pElement.textContent = feed.description;
      liElement.replaceChildren(h3Element, pElement);
      return liElement;
    });
    list.append(...elements);
    feedsContainer.replaceChildren(list);
  };

  const renderStatus = (addFeedStatus, states, element, i18nextInstance) => {
    element.inputElement.classList.remove('is-invalid');
    switch (addFeedStatus) {
      case 'processing':
        element.feedback.textContent = i18nextInstance.t('forms.isLoading');
        element.inputElement.setAttribute('readonly', 'true');
        element.addbuttonElement.setAttribute('disabled', 'true');
        element.feedback.classList.remove('text-danger');
        break;
      case 'error':
        element.feedback.textContent = i18nextInstance.t(states.errorMessage);
        element.inputElement.classList.add('is-invalid');
        element.feedback.classList.add('text-danger');
        element.inputElement.removeAttribute('readonly');
        element.addbuttonElement.removeAttribute('disabled');
        break;
      case 'ready':
        element.feedback.textContent = i18nextInstance.t('forms.success');
        element.inputElement.removeAttribute('readonly');
        element.inputElement.value = '';
        element.addbuttonElement.removeAttribute('disabled');
        break;
      default:
        break;
    }
  };

  const renderModal = (states, modal) => {
    const post = _.find(states.data.posts, { guid: states.currentGuid });
    const modalTitle = modal.querySelector('.modal-title');
    const modalDescription = modal.querySelector('#modalDescription');
    const modalLink = modal.querySelector('#modalLink');
    modalTitle.textContent = post.title;
    modalDescription.textContent = post.description;
    modalLink.href = post.link;
  };

  const checkPostSeen = (guid, postsContainer) => {
    const button = postsContainer.querySelector(`button[data-bs-guid="${guid}"]`);
    const link = button.previousSibling;
    link.classList.add('fw-normal', 'link-secondary');
    link.classList.remove('fw-bold');
  };

  const createViewDetailsButton = (post, i18nextInstance) => {
    const button = document.createElement('button');
    button.textContent = i18nextInstance.t('forms.viewButton');
    button.classList.add('btn', 'btn-primary', 'btn-sm');
    button.setAttribute('data-bs-toggle', 'modal');
    button.setAttribute('data-bs-target', '#modal');
    button.setAttribute('data-bs-guid', post.guid);
    return button;
  };

  const renderPosts = (states, postsContainer, i18nextInstance) => {
    const { posts } = states.data;
    const list = document.createElement('ul');
    list.classList.add('list-group');
    const elements = posts.map((post) => {
      const liElement = document.createElement('li');
      const aElement = document.createElement('a');
      aElement.textContent = post.title;
      aElement.href = post.link;
      if (states.seenGuids.includes(post.guid)) {
        aElement.classList.add('fw-normal', 'link-secondary');
      } else {
        aElement.classList.add('fw-bold');
      }
      aElement.setAttribute('target', '_blank');
      const buttonElement = createViewDetailsButton(post, i18nextInstance);
      liElement.replaceChildren(aElement, buttonElement);
      liElement.classList.add('justify-content-between', 'd-flex', 'list-group-item');
      return liElement;
    });
    list.append(...elements);
    postsContainer.replaceChildren(list);
  };

  const watchedState = onChange(state, (path, value) => {
    switch (path) {
      case 'errorMessage':
        break;
      case 'data.feeds':
        renderFeeds(value, ui.feedsContainer);
        break;
      case 'addFeedStatus':
        renderStatus(value, watchedState, ui, i18next);
        break;
      case 'currentGuid':
        renderModal(watchedState, ui.modal);
        checkPostSeen(value, ui.postsContainer);
        break;
      case 'seenGuids':
        break;
      case 'data.posts':
        renderPosts(watchedState, ui.postsContainer, i18next);
        break;
      default:
        throw Error(`unknown path: ${path}`);
    }
    renderPosts(watchedState, ui.postsContainer, i18next);
  });
  return watchedState;
};

export default watch;
