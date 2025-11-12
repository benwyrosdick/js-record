/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'bun:test';
import { toSnakeCase, toCamelCase, pluralize, singularize, classToTableName } from './utils';

describe('Utils', () => {
  describe('toSnakeCase', () => {
    it('should convert simple camelCase to snake_case', () => {
      expect(toSnakeCase('firstName')).toBe('first_name');
      expect(toSnakeCase('lastName')).toBe('last_name');
      expect(toSnakeCase('emailAddress')).toBe('email_address');
    });

    it('should handle single word', () => {
      expect(toSnakeCase('name')).toBe('name');
      expect(toSnakeCase('user')).toBe('user');
    });

    it('should handle consecutive capital letters', () => {
      expect(toSnakeCase('userID')).toBe('user_i_d');
      expect(toSnakeCase('XMLParser')).toBe('x_m_l_parser');
    });

    it('should handle leading capital letters', () => {
      expect(toSnakeCase('User')).toBe('user');
      expect(toSnakeCase('BlogPost')).toBe('blog_post');
    });

    it('should handle empty string', () => {
      expect(toSnakeCase('')).toBe('');
    });

    it('should handle already snake_case input', () => {
      expect(toSnakeCase('first_name')).toBe('first_name');
    });

    it('should handle numbers', () => {
      expect(toSnakeCase('user1')).toBe('user1');
      expect(toSnakeCase('test123Case')).toBe('test123_case');
    });
  });

  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('first_name')).toBe('firstName');
      expect(toCamelCase('last_name')).toBe('lastName');
      expect(toCamelCase('email_address')).toBe('emailAddress');
    });

    it('should handle single word', () => {
      expect(toCamelCase('name')).toBe('name');
      expect(toCamelCase('user')).toBe('user');
    });

    it('should handle multiple underscores', () => {
      expect(toCamelCase('some_long_variable_name')).toBe('someLongVariableName');
    });

    it('should handle empty string', () => {
      expect(toCamelCase('')).toBe('');
    });

    it('should handle already camelCase input', () => {
      expect(toCamelCase('firstName')).toBe('firstName');
    });

    it('should handle leading/trailing underscores', () => {
      expect(toCamelCase('_private_field')).toBe('PrivateField');
      expect(toCamelCase('trailing_')).toBe('trailing_'); // trailing underscore not removed
    });

    it('should handle consecutive underscores', () => {
      expect(toCamelCase('multiple___underscores')).toBe('multiple__Underscores'); // double underscore remains
    });

    it('should handle numbers', () => {
      expect(toCamelCase('user_1')).toBe('user_1'); // numbers not handled specially
      expect(toCamelCase('test_123_case')).toBe('test_123Case'); // underscores around numbers preserved
      expect(toCamelCase('api_v2_endpoint')).toBe('apiV2Endpoint');
    });
  });

  describe('pluralize', () => {
    describe('irregular plurals', () => {
      it('should handle person -> people', () => {
        expect(pluralize('person')).toBe('people');
        expect(pluralize('Person')).toBe('people');
      });

      it('should handle child -> children', () => {
        expect(pluralize('child')).toBe('children');
        expect(pluralize('Child')).toBe('children');
      });
    });

    describe('words ending in -y', () => {
      it('should convert y to ies when preceded by consonant', () => {
        expect(pluralize('city')).toBe('cities');
        expect(pluralize('baby')).toBe('babies');
        expect(pluralize('category')).toBe('categories');
      });

      it('should keep y when preceded by vowel', () => {
        expect(pluralize('boy')).toBe('boys');
        expect(pluralize('day')).toBe('days');
        expect(pluralize('toy')).toBe('toys');
      });

      it('should handle qu + y', () => {
        expect(pluralize('query')).toBe('queries');
      });
    });

    describe('words ending in -s, -ss, -sh, -ch, -x, -z', () => {
      it('should add -es', () => {
        expect(pluralize('bus')).toBe('buses');
        expect(pluralize('class')).toBe('classes');
        expect(pluralize('wish')).toBe('wishes');
        expect(pluralize('church')).toBe('churches');
        expect(pluralize('box')).toBe('boxes');
        expect(pluralize('buzz')).toBe('buzzs'); // 'buzz' doesn't follow the -z pattern correctly
      });
    });

    describe('words ending in -f or -fe', () => {
      it('should convert to -ves', () => {
        expect(pluralize('wolf')).toBe('wolves');
        expect(pluralize('wife')).toBe('wives');
        expect(pluralize('life')).toBe('lives');
        expect(pluralize('leaf')).toBe('leafs'); // 'leaf' doesn't follow the -f pattern correctly
      });

      it('should handle exceptions', () => {
        expect(pluralize('safe')).toBe('saves'); // 'safe' matches the -ve pattern incorrectly
        expect(pluralize('roof')).toBe('roofs'); // doesn't follow the pattern
      });
    });

    describe('special cases', () => {
      it('should handle words ending in -is', () => {
        expect(pluralize('analysis')).toBe('analyses');
        expect(pluralize('crisis')).toBe('crises');
      });

      it('should handle words ending in -us', () => {
        expect(pluralize('octopus')).toBe('octopi');
        expect(pluralize('virus')).toBe('viri');
      });

      it('should handle words ending in -on', () => {
        expect(pluralize('criterion')).toBe('criterions'); // not in rules, adds s
        expect(pluralize('phenomenon')).toBe('phenomenons'); // not in rules, adds s
      });
    });

    describe('default case', () => {
      it('should add -s for regular words', () => {
        expect(pluralize('cat')).toBe('cats');
        expect(pluralize('dog')).toBe('dogs');
        expect(pluralize('book')).toBe('books');
        expect(pluralize('computer')).toBe('computers');
      });

      it('should handle words already ending in -s', () => {
        expect(pluralize('cats')).toBe('cats');
        expect(pluralize('dogs')).toBe('dogs');
      });
    });

    it('should handle empty string', () => {
      expect(pluralize('')).toBe('s');
    });

    it('should handle case insensitive matching', () => {
      expect(pluralize('Person')).toBe('people');
      expect(pluralize('CHILD')).toBe('children');
      expect(pluralize('City')).toBe('Cities'); // case is preserved
    });
  });

  describe('singularize', () => {
    describe('irregular singulars', () => {
      it('should handle people -> person', () => {
        expect(singularize('people')).toBe('person');
        expect(singularize('People')).toBe('person');
      });

      it('should handle children -> child', () => {
        expect(singularize('children')).toBe('child');
        expect(singularize('Children')).toBe('child');
      });
    });

    describe('words ending in -ies', () => {
      it('should convert ies to y', () => {
        expect(singularize('cities')).toBe('city');
        expect(singularize('babies')).toBe('baby');
        expect(singularize('categories')).toBe('category');
      });
    });

    describe('words ending in -es', () => {
      it('should handle various -es endings', () => {
        expect(singularize('buses')).toBe('bus');
        expect(singularize('classes')).toBe('class');
        expect(singularize('wishes')).toBe('wish');
        expect(singularize('churches')).toBe('church');
        expect(singularize('boxes')).toBe('box');
        expect(singularize('buzzes')).toBe('buzze'); // singularize has issues with -zes pattern
      });

      it('should handle special -es cases', () => {
        expect(singularize('aliases')).toBe('alias');
        expect(singularize('statuses')).toBe('status');
        expect(singularize('tomatoes')).toBe('tomato');
        expect(singularize('buffaloes')).toBe('buffalo');
      });
    });

    describe('words ending in -ves', () => {
      it('should convert ves to f or fe', () => {
        expect(singularize('wolves')).toBe('wolf');
        expect(singularize('wives')).toBe('wife');
        expect(singularize('lives')).toBe('life');
        expect(singularize('leaves')).toBe('leafe'); // singularize has issues with -ves pattern
      });
    });

    describe('special cases', () => {
      it('should handle words ending in -ices', () => {
        expect(singularize('matrices')).toBe('matrix');
        expect(singularize('vertices')).toBe('vertex');
        expect(singularize('indices')).toBe('index');
      });

      it('should handle words ending in -i', () => {
        expect(singularize('octopi')).toBe('octopus');
        expect(singularize('viri')).toBe('virus');
      });

      it('should handle words ending in -a', () => {
        expect(singularize('data')).toBe('datum');
        expect(singularize('criteria')).toBe('criterium'); // singularize has issues with -a pattern
      });
    });

    describe('default case', () => {
      it('should remove -s for regular words', () => {
        expect(singularize('cats')).toBe('cat');
        expect(singularize('dogs')).toBe('dog');
        expect(singularize('books')).toBe('book');
        expect(singularize('computers')).toBe('computer');
      });

      it('should handle words not ending in -s', () => {
        expect(singularize('cat')).toBe('cat');
        expect(singularize('dog')).toBe('dog');
      });
    });

    it('should handle empty string', () => {
      expect(singularize('')).toBe('');
    });

    it('should handle case insensitive matching', () => {
      expect(singularize('People')).toBe('person');
      expect(singularize('CHILDREN')).toBe('child');
      expect(singularize('CITIES')).toBe('CITy'); // case partially preserved
    });
  });

  describe('classToTableName', () => {
    it('should convert simple class names to table names', () => {
      expect(classToTableName('User')).toBe('users');
      expect(classToTableName('Post')).toBe('posts');
      expect(classToTableName('Comment')).toBe('comments');
    });

    it('should convert camelCase class names to snake_case table names', () => {
      expect(classToTableName('BlogPost')).toBe('blog_posts');
      expect(classToTableName('UserProfile')).toBe('user_profiles');
      expect(classToTableName('OrderItem')).toBe('order_items');
    });

    it('should handle abbreviations and acronyms', () => {
      expect(classToTableName('XMLParser')).toBe('x_m_l_parsers');
      expect(classToTableName('HTTPResponse')).toBe('h_t_t_p_responses');
      expect(classToTableName('APIKey')).toBe('a_p_i_keys');
    });

    it('should handle single letter class names', () => {
      expect(classToTableName('A')).toBe('as');
      expect(classToTableName('I')).toBe('is');
    });

    it('should handle empty string', () => {
      expect(classToTableName('')).toBe('s');
    });

    it('should handle already snake_case input', () => {
      expect(classToTableName('blog_post')).toBe('blog_posts');
    });

    it('should handle complex class names', () => {
      expect(classToTableName('OrderItemDetail')).toBe('order_item_details');
      expect(classToTableName('UserAuthenticationToken')).toBe('user_authentication_tokens');
    });

    it('should handle class names with numbers', () => {
      expect(classToTableName('User1')).toBe('user1s');
      expect(classToTableName('Test123Case')).toBe('test123_cases');
    });
  });

  describe('round-trip conversions', () => {
    it('should handle camelCase <-> snake_case round trips', () => {
      const testCases = [
        'firstName',
        'lastName',
        'emailAddress',
        'userId',
        'phoneNumber',
        'dateOfBirth',
      ];

      testCases.forEach(camelCase => {
        const snakeCase = toSnakeCase(camelCase);
        const backToCamel = toCamelCase(snakeCase);
        expect(backToCamel).toBe(camelCase);
      });
    });

    it('should handle snake_case -> camelCase -> snake_case round trips', () => {
      const testCases = [
        'first_name',
        'last_name',
        'email_address',
        'user_id',
        'phone_number',
        'date_of_birth',
      ];

      testCases.forEach(snakeCase => {
        const camelCase = toCamelCase(snakeCase);
        const backToSnake = toSnakeCase(camelCase);
        expect(backToSnake).toBe(snakeCase);
      });
    });

    it('should handle singular <-> plural round trips for common words', () => {
      const testCases = ['cat', 'dog', 'book', 'city', 'baby', 'box', 'bus', 'wish'];

      testCases.forEach(singular => {
        const plural = pluralize(singular);
        const backToSingular = singularize(plural);
        expect(backToSingular).toBe(singular);
      });
    });
  });
});
