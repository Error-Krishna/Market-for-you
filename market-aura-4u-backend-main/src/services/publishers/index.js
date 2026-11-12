const twitterPublisher = require('./twitterPublisher');
const linkedinPublisher = require('./linkedinPublisher');
const instagramPublisher = require('./instagramPublisher');
const facebookPublisher = require('./facebookPublisher');
const emailPublisher = require('./emailPublisher');
const blogPublisher = require('./blogPublisher');
const { PublisherError } = require('./publisherErrors');

const PUBLISHERS = {
  twitter: twitterPublisher,
  linkedin: linkedinPublisher,
  instagram: instagramPublisher,
  facebook: facebookPublisher,
  email: emailPublisher,
  blog: blogPublisher,
};

async function publishToPlatform(platform, params) {
  const publisher = PUBLISHERS[platform];
  if (!publisher) {
    throw new PublisherError(`Unsupported platform "${platform}".`, {
      code: 'UNSUPPORTED_PLATFORM',
      retryable: false,
    });
  }
  return publisher.publish(params);
}

module.exports = {
  PUBLISHERS,
  publishToPlatform,
  PublisherError,
};
