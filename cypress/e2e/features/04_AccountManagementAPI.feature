@api
Feature: 04 Account management API

  Background:
    Given I prepare a unique account payload

  @smoke
  Scenario: 01 Create a new account
    When I send a "POST" request to "/createAccount" with the prepared account payload
    Then the response status should be "200"
    And the API response code should be "201"
    And the API response message should be "User created!"
    And the response body should match the "message" schema

  Scenario: 02 Updated account details are persisted
    Given I create the prepared account via API
    And I update the prepared account details
    When I send a "PUT" request to "/updateAccount" with the prepared account payload
    Then the API response code should be "200"
    And the API response message should be "User updated!"
    When I request the user details for the prepared account
    Then the API response code should be "200"
    And the response body should match the "user details" schema
    And the returned user details should match the prepared account

  Scenario: 03 Login verification accepts valid credentials
    Given I create the prepared account via API
    When I verify login for the prepared account with the correct password
    Then the API response code should be "200"
    And the API response message should be "User exists!"
    And the response body should match the "message" schema

  Scenario: 04 Login verification rejects an incorrect password
    Given I create the prepared account via API
    When I verify login for the prepared account with an incorrect password
    Then the API response code should be "404"
    And the API response message should be "User not found!"
    And the response body should match the "message" schema

  Scenario: 05 Delete an account
    Given I create the prepared account via API
    When I delete the prepared account via API
    Then the API response code should be "200"
    And the API response message should be "Account deleted!"
    When I request the user details for the prepared account
    Then the API response code should be "404"
    And the response body should match the "message" schema

  Scenario: 06 Login verification without credentials is a bad request
    When I send a "POST" request to "/verifyLogin"
    Then the API response code should be "400"
    And the API response message should be "Bad request, email or password parameter is missing in POST request."
    And the response body should match the "message" schema

  Scenario: 07 Unsupported method is rejected
    When I send a "DELETE" request to "/verifyLogin"
    Then the API response code should be "405"
    And the API response message should be "This request method is not supported."
    And the response body should match the "message" schema
