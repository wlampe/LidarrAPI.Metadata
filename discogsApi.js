const request = require('request-promise-native');
const providerName = 'discogs';

module.exports = function(db, token) {
  const dRequest = request.defaults({
    method: 'GET',
    headers: {
      'User-Agent': 'nodejs-request-library',
      'Authorization': 'Discogs token=' + token
    },
    qs: {
      page: 1,
      per_page: 50
    }
  });

  const baseUrl = 'https://api.discogs.com/';

  // Search for query and return all results
  function searchGeneric(reqObj, mapFunc) {
    return dRequest(reqObj)
    .then(JSON.parse)
    .then(mapFunc);
  }
  const search = {};
  search.artist = query => searchGeneric({ url: (baseUrl + 'database/search'), qs: { q: query, type: 'artist' } }, data => data.results.map(item => {
    return {
      Id: providerName + '-' + item.id, // Prepend provider name
      ArtistName: item.title,
      ImageUrl: item.thumb,
      Url: item.resource_url
    };
  }));
  search.albumByArtist = artistId => {
    // Split ID
    artistId = artistId.split('-').slice(1).join('-');

    return searchGeneric({ url: (baseUrl + 'artists/' + artistId + '/releases') }, data => data.releases.map(item => {
      return {
        Id: providerName + '-' + item.id, // Prepend provider name
        AlbumName: item.title,
        Year: item.year,
        Label: item.label,
        ImageUrl: item.thumb,
        Url: item.resource_url
      };
    }));
  }

  // Get data about a specific item with a specific id
  function getGeneric(type, id, mapFunc) {
    return dRequest({ url: (baseUrl + type + '/' + id) })
    .then(JSON.parse)
    .then(mapFunc);
  }
  const get = {};
  get.albums = id => getGeneric('releases', id, item => {
    return {
      AlbumName: item.title,
      Artist: {
        Id: item.artists[0].id,
        ArtistName: item.artists[0].name,
        ArtistUrl: item.artists[0].resource_url
      },
      Year: item.year,
      Genres: item.genres,
      Overview: item.notes,
      Labels: item.labels.map(item => {
        return {
          Name: item.name,
          CatalogNumber: item.catno,
          ProviderIds: { [providerName]: id }
        };
      }),
      Images: item.images.map(item => {
        return {
          Url: item.uri,
          Height: item.height,
          Width: item.width
        };
      }),
      Url: item.uri,
      ProviderIds: { [providerName]: id }
    };
  });
  get.artists = id => getGeneric('artists', id, item => {
    return {
      ArtistName: item.name,
      Overview: item.profile,
      Images: item.images.map(item => {
        return {
          Url: item.uri,
          Height: item.height,
          Width: item.width
        };
      }),
      Url: item.uri,
      ProviderIds: { [providerName]: id }
    };
  });
  // TODO: tracks

  return { search, get };
}
